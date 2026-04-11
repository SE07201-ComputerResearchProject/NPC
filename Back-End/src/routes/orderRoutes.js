import express from 'express';
import Build from '../models/Build.js';
import Cart from '../models/Cart.js';
import Component from '../models/Component.js';
import Order from '../models/Order.js';
import Voucher from '../models/Voucher.js';
import { requireAdmin, requireAuth } from '../middleware/adminMiddleware.js';
import { loadOrderForCurrentUserOrAdmin, validateCheckoutSource, validateOrderIdParam } from '../middleware/commerceMiddleware.js';
import { buildPartsToItems, calculateItemsTotal, hasAnyBuildParts } from '../utils/commerceUtils.js';

const router = express.Router();

function normalizeVoucherCode(value) {
  return String(value || '').trim().toUpperCase();
}

function isVoucherUsableNow(voucher, now = new Date()) {
  if (!voucher || !voucher.isActive) return false;

  if (voucher.startsAt && new Date(voucher.startsAt).getTime() > now.getTime()) {
    return false;
  }

  if (voucher.expiresAt && new Date(voucher.expiresAt).getTime() < now.getTime()) {
    return false;
  }

  if (Number(voucher.maxUses || 0) > 0 && Number(voucher.usedCount || 0) >= Number(voucher.maxUses || 0)) {
    return false;
  }

  return true;
}

function computeVoucherDiscount(subtotal, voucher) {
  const safeSubtotal = Math.max(0, Number(subtotal || 0));
  const percent = Math.max(0, Number(voucher?.discountPercent || 0));
  const maxDiscount = Math.max(0, Number(voucher?.maxDiscount || 0));

  const rawDiscount = Math.round((safeSubtotal * percent) / 100);
  return Math.min(rawDiscount, maxDiscount, safeSubtotal);
}

function serializeOrder(order) {
  return {
    id: order._id,
    source: order.source,
    buildName: order.buildName || '',
    items: order.items || [],
    totalAmount: order.totalAmount || 0,
    pricing: {
      subtotal: Number(order?.pricing?.subtotal || order.totalAmount || 0),
      shipping: Number(order?.pricing?.shipping || 0),
      discountAmount: Number(order?.pricing?.discountAmount || 0),
    },
    voucher: {
      code: String(order?.voucher?.code || ''),
      discountPercent: Number(order?.voucher?.discountPercent || 0),
      maxDiscount: Number(order?.voucher?.maxDiscount || 0),
      discountAmount: Number(order?.voucher?.discountAmount || 0),
    },
    currency: order.currency || 'VND',
    status: order.status,
    orderInfo: order.orderInfo || '',
    payment: order.payment || {},
    createdAt: order.createdAt || null,
    updatedAt: order.updatedAt || null,
  };
}

function serializeAdminOrder(order) {
  return {
    ...serializeOrder(order),
    user: {
      id: order.user?._id || null,
      username: order.user?.username || '',
      email: order.user?.email || '',
      fullName: order.user?.fullName || '',
      role: order.user?.role || '',
    },
  };
}

async function getCartItemCategories(userId) {
  const cart = await Cart.findOne({ user: userId }).lean();
  if (!Array.isArray(cart?.items)) return [];
  
  const components = await Promise.all(
    cart.items
      .filter(item => item.type === 'component' && item.componentId)
      .map(item => Component.findById(item.componentId).select('category').lean())
  );
  
  const categories = new Set();
  components.forEach(comp => {
    if (comp?.category) categories.add(comp.category);
  });
  
  return Array.from(categories);
}

function isVoucherApplicableToCategories(voucherCategories, cartCategories) {
  if (!Array.isArray(voucherCategories) || voucherCategories.length === 0) {
    return true;
  }
  if (!Array.isArray(cartCategories) || cartCategories.length === 0) {
    return false;
  }
  return cartCategories.some(cat => voucherCategories.includes(cat));
}

router.get('/admin/list', requireAdmin, async (req, res) => {
  try {
    const orders = await Order.find({})
      .populate('user', 'username email fullName role')
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json(orders.map(serializeAdminOrder));
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch admin order list', error: error.message });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.currentUser.userId })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json(orders.map(serializeOrder));
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch orders', error: error.message });
  }
});

router.get('/:id', requireAuth, validateOrderIdParam, loadOrderForCurrentUserOrAdmin, async (req, res) => {
  try {
    return res.status(200).json(serializeOrder(req.order));
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch order', error: error.message });
  }
});

router.post('/checkout', requireAuth, validateCheckoutSource, async (req, res) => {
  try {
    const source = req.checkoutSource;
    const shippingAddress = req.body.shippingAddress || {};
    const voucherCode = normalizeVoucherCode(req.body.voucherCode);

    let items = [];
    let buildName = '';

    if (source === 'cart') {
      const cart = await Cart.findOne({ user: req.currentUser.userId }).lean();
      items = Array.isArray(cart?.items) ? cart.items : [];
      if (!items.length) {
        return res.status(400).json({ message: 'Cart is empty' });
      }
    } else {
      const build = await Build.findOne({ user: req.currentUser.userId }).lean();
      const parts = build?.parts || {};

      if (!hasAnyBuildParts(parts)) {
        return res.status(400).json({ message: 'Build is empty' });
      }

      items = buildPartsToItems(parts);
      buildName = build?.name || 'New Build';
    }

    const subtotal = calculateItemsTotal(items);
    if (!subtotal || subtotal <= 0) {
      return res.status(400).json({ message: 'Invalid order total' });
    }

    let discountAmount = 0;
    let voucherSnapshot = {
      code: '',
      discountPercent: 0,
      maxDiscount: 0,
      discountAmount: 0,
    };

    if (source === 'cart' && voucherCode) {
      const voucher = await Voucher.findOne({ code: voucherCode }).lean();
      if (!isVoucherUsableNow(voucher)) {
        return res.status(400).json({ message: 'Voucher is invalid or expired' });
      }

      const cartCategories = await getCartItemCategories(req.currentUser.userId);
      if (!isVoucherApplicableToCategories(voucher.categories, cartCategories)) {
        return res.status(400).json({ message: 'Voucher does not apply to items in your cart' });
      }

      discountAmount = computeVoucherDiscount(subtotal, voucher);
      voucherSnapshot = {
        code: voucher.code,
        discountPercent: Number(voucher.discountPercent || 0),
        maxDiscount: Number(voucher.maxDiscount || 0),
        discountAmount,
      };
    }

    const totalAmount = Math.max(0, subtotal - discountAmount);

    const orderInfo = source === 'build'
      ? `Payment for build ${buildName || 'New Build'}`
      : `Thanh toan gio hang (${items.length} san pham)`;

    const order = await Order.create({
      user: req.currentUser.userId,
      source,
      buildName,
      items,
      totalAmount,
      pricing: {
        subtotal,
        shipping: 0,
        discountAmount,
      },
      voucher: voucherSnapshot,
      currency: 'VND',
      status: 'pending',
      orderInfo,
      shippingAddress: {
        street: shippingAddress.street || '',
        city: shippingAddress.city || '',
        state: shippingAddress.state || '',
        zip: shippingAddress.zip || '',
      },
    });

    return res.status(201).json({
      message: 'Order created successfully',
      order: serializeOrder(order.toObject()),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create order', error: error.message });
  }
});

export default router;
