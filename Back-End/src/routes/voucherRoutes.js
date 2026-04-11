import express from 'express';
import Cart from '../models/Cart.js';
import Component from '../models/Component.js';
import Voucher from '../models/Voucher.js';
import { requireAdmin, requireAuth } from '../middleware/adminMiddleware.js';
import { calculateItemsTotal } from '../utils/commerceUtils.js';

const router = express.Router();

function normalizeVoucherCode(value) {
  return String(value || '').trim().toUpperCase();
}

function computeVoucherDiscount(subtotal, voucher) {
  const safeSubtotal = Math.max(0, Number(subtotal || 0));
  const percent = Math.max(0, Number(voucher?.discountPercent || 0));
  const maxDiscount = Math.max(0, Number(voucher?.maxDiscount || 0));

  const rawDiscount = Math.round((safeSubtotal * percent) / 100);
  const discountAmount = Math.min(rawDiscount, maxDiscount, safeSubtotal);

  return {
    discountAmount,
    totalAmount: Math.max(0, safeSubtotal - discountAmount),
  };
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

function serializeVoucher(voucher) {
  return {
    id: voucher._id,
    code: voucher.code,
    discountPercent: Number(voucher.discountPercent || 0),
    maxDiscount: Number(voucher.maxDiscount || 0),
    isActive: Boolean(voucher.isActive),
    startsAt: voucher.startsAt || null,
    expiresAt: voucher.expiresAt || null,
    maxUses: Number(voucher.maxUses || 0),
    usedCount: Number(voucher.usedCount || 0),
    categories: Array.isArray(voucher.categories) ? voucher.categories : [],
    createdAt: voucher.createdAt || null,
    updatedAt: voucher.updatedAt || null,
  };
}

function generateVoucherCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const randomPart = Array.from({ length: 8 })
    .map(() => alphabet[Math.floor(Math.random() * alphabet.length)])
    .join('');
  return `VOUCHER-${randomPart}`;
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

router.post('/validate-cart', requireAuth, async (req, res) => {
  try {
    const code = normalizeVoucherCode(req.body.code);
    if (!code) {
      return res.status(400).json({ message: 'Voucher code is required' });
    }

    const cart = await Cart.findOne({ user: req.currentUser.userId }).lean();
    const items = Array.isArray(cart?.items) ? cart.items : [];
    if (!items.length) {
      return res.status(400).json({ message: 'Cart is empty' });
    }

    const voucher = await Voucher.findOne({ code }).lean();
    if (!isVoucherUsableNow(voucher)) {
      return res.status(400).json({ message: 'Voucher is invalid or expired' });
    }

    const cartCategories = await getCartItemCategories(req.currentUser.userId);
    if (!isVoucherApplicableToCategories(voucher.categories, cartCategories)) {
      return res.status(400).json({ message: 'Voucher does not apply to items in your cart' });
    }

    const subtotal = calculateItemsTotal(items);
    const { discountAmount, totalAmount } = computeVoucherDiscount(subtotal, voucher);

    return res.status(200).json({
      message: 'Voucher applied successfully',
      voucher: {
        code: voucher.code,
        discountPercent: Number(voucher.discountPercent || 0),
        maxDiscount: Number(voucher.maxDiscount || 0),
      },
      totals: {
        subtotal,
        discountAmount,
        totalAmount,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to validate voucher', error: error.message });
  }
});

router.get('/admin/list', requireAdmin, async (req, res) => {
  try {
    const vouchers = await Voucher.find({}).sort({ createdAt: -1 }).lean();
    return res.status(200).json(vouchers.map(serializeVoucher));
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch vouchers', error: error.message });
  }
});

router.post('/admin/generate', requireAdmin, async (req, res) => {
  try {
    const code = normalizeVoucherCode(req.body.code) || generateVoucherCode();
    const discountPercent = Number(req.body.discountPercent || 0);
    const maxDiscount = Number(req.body.maxDiscount || 0);
    const maxUses = Math.max(0, Number(req.body.maxUses || 0));
    const startsAtRaw = req.body.startsAt ? new Date(req.body.startsAt) : new Date();
    const expiresAtRaw = req.body.expiresAt ? new Date(req.body.expiresAt) : null;

    if (!code) {
      return res.status(400).json({ message: 'Voucher code is required' });
    }

    if (!Number.isFinite(discountPercent) || discountPercent <= 0 || discountPercent > 100) {
      return res.status(400).json({ message: 'discountPercent must be between 1 and 100' });
    }

    if (!Number.isFinite(maxDiscount) || maxDiscount < 0) {
      return res.status(400).json({ message: 'maxDiscount must be >= 0' });
    }

    if (expiresAtRaw && Number.isNaN(expiresAtRaw.getTime())) {
      return res.status(400).json({ message: 'Invalid expiresAt value' });
    }

    if (startsAtRaw && Number.isNaN(startsAtRaw.getTime())) {
      return res.status(400).json({ message: 'Invalid startsAt value' });
    }

    if (expiresAtRaw && startsAtRaw && expiresAtRaw.getTime() <= startsAtRaw.getTime()) {
      return res.status(400).json({ message: 'expiresAt must be later than startsAt' });
    }

    const existing = await Voucher.findOne({ code }).lean();
    if (existing) {
      return res.status(409).json({ message: 'Voucher code already exists' });
    }

    const voucher = await Voucher.create({
      code,
      discountPercent,
      maxDiscount,
      maxUses,
      startsAt: startsAtRaw,
      expiresAt: expiresAtRaw,
      isActive: true,
      createdBy: req.currentUser?.userId || null,
    });

    return res.status(201).json({
      message: 'Voucher generated successfully',
      voucher: serializeVoucher(voucher.toObject()),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to generate voucher', error: error.message });
  }
});

router.put('/admin/:id/toggle', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: 'Voucher ID is required' });
    }

    const voucher = await Voucher.findById(id);
    if (!voucher) {
      return res.status(404).json({ message: 'Voucher not found' });
    }

    voucher.isActive = !voucher.isActive;
    await voucher.save();

    return res.status(200).json({
      message: 'Voucher status updated',
      voucher: serializeVoucher(voucher.toObject()),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to toggle voucher', error: error.message });
  }
});

router.put('/admin/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: 'Voucher ID is required' });
    }

    const updates = {};

    if (req.body.discountPercent !== undefined) {
      const percent = Number(req.body.discountPercent);
      if (!Number.isFinite(percent) || percent <= 0 || percent > 100) {
        return res.status(400).json({ message: 'discountPercent must be between 1 and 100' });
      }
      updates.discountPercent = percent;
    }

    if (req.body.maxDiscount !== undefined) {
      const maxDisc = Number(req.body.maxDiscount);
      if (!Number.isFinite(maxDisc) || maxDisc < 0) {
        return res.status(400).json({ message: 'maxDiscount must be >= 0' });
      }
      updates.maxDiscount = maxDisc;
    }

    if (req.body.maxUses !== undefined) {
      const maxUses = Math.max(0, Number(req.body.maxUses || 0));
      updates.maxUses = maxUses;
    }

    if (req.body.expiresAt !== undefined) {
      if (req.body.expiresAt === null) {
        updates.expiresAt = null;
      } else {
        const expiresAt = new Date(req.body.expiresAt);
        if (Number.isNaN(expiresAt.getTime())) {
          return res.status(400).json({ message: 'Invalid expiresAt value' });
        }
        updates.expiresAt = expiresAt;
      }
    }

    if (Array.isArray(req.body.categories)) {
      const validCategories = ['case', 'cpu', 'motherboard', 'gpu', 'ram', 'storage', 'psu', 'cooler', 'fan'];
      const filtered = req.body.categories.filter(cat => validCategories.includes(cat.toLowerCase()));
      updates.categories = filtered;
    }

    const voucher = await Voucher.findByIdAndUpdate(id, updates, { new: true });
    if (!voucher) {
      return res.status(404).json({ message: 'Voucher not found' });
    }

    return res.status(200).json({
      message: 'Voucher updated successfully',
      voucher: serializeVoucher(voucher.toObject()),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update voucher', error: error.message });
  }
});

router.delete('/admin/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: 'Voucher ID is required' });
    }

    const deleted = await Voucher.findByIdAndDelete(id).lean();
    if (!deleted) {
      return res.status(404).json({ message: 'Voucher not found' });
    }

    return res.status(200).json({ message: 'Voucher deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete voucher', error: error.message });
  }
});

export default router;
