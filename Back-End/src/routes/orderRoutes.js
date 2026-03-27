import express from 'express';
import Build from '../models/Build.js';
import Cart from '../models/Cart.js';
import Order from '../models/Order.js';
import { requireAdmin, requireAuth } from '../middleware/adminMiddleware.js';
import { loadOrderForCurrentUserOrAdmin, validateCheckoutSource, validateOrderIdParam } from '../middleware/commerceMiddleware.js';
import { buildPartsToItems, calculateItemsTotal, hasAnyBuildParts } from '../utils/commerceUtils.js';

const router = express.Router();

function serializeOrder(order) {
  return {
    id: order._id,
    source: order.source,
    buildName: order.buildName || '',
    items: order.items || [],
    totalAmount: order.totalAmount || 0,
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
    id: order._id,
    source: order.source,
    buildName: order.buildName || '',
    items: order.items || [],
    totalAmount: order.totalAmount || 0,
    currency: order.currency || 'VND',
    status: order.status,
    orderInfo: order.orderInfo || '',
    payment: order.payment || {},
    createdAt: order.createdAt || null,
    updatedAt: order.updatedAt || null,
    user: {
      id: order.user?._id || null,
      username: order.user?.username || '',
      email: order.user?.email || '',
      fullName: order.user?.fullName || '',
      role: order.user?.role || '',
    },
  };
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

    const totalAmount = calculateItemsTotal(items);
    if (!totalAmount || totalAmount <= 0) {
      return res.status(400).json({ message: 'Invalid order total' });
    }

    const orderInfo = source === 'build'
      ? `Payment for build ${buildName || 'New Build'}`
      : `Thanh toan gio hang (${items.length} san pham)`;

    const order = await Order.create({
      user: req.currentUser.userId,
      source,
      buildName,
      items,
      totalAmount,
      currency: 'VND',
      status: 'pending',
      orderInfo,
      payment: {
        provider: 'momo',
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
