import mongoose from 'mongoose';
import Order from '../models/Order.js';
import { normalizeBuildParts, normalizeCartItems } from '../utils/commerceUtils.js';

function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

export function validateCartPayload(req, res, next) {
  const body = req.body || {};
  const rawItems = body.items;

  if (!Array.isArray(rawItems)) {
    return res.status(400).json({ message: 'items must be an array' });
  }

  const items = normalizeCartItems(rawItems);
  if (items.length !== rawItems.length) {
    return res.status(400).json({ message: 'items contain invalid component snapshots' });
  }

  req.validatedCartItems = items;
  return next();
}

export function validateBuildPayload(req, res, next) {
  const body = req.body || {};

  if (!hasOwn(body, 'parts') || typeof body.parts !== 'object' || body.parts === null) {
    return res.status(400).json({ message: 'parts must be an object' });
  }

  const rawName = hasOwn(body, 'name') ? body.name : 'New Build';
  const name = String(rawName || 'New Build').trim() || 'New Build';

  if (name.length > 120) {
    return res.status(400).json({ message: 'Build name must be at most 120 characters' });
  }

  req.validatedBuildName = name;
  req.validatedBuildParts = normalizeBuildParts(body.parts || {});
  return next();
}

export function validateCheckoutSource(req, res, next) {
  const source = req.body?.source;
  if (source !== 'cart' && source !== 'build') {
    return res.status(400).json({ message: 'source must be either cart or build' });
  }

  req.checkoutSource = source;
  return next();
}

export function validateOrderIdParam(req, res, next) {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid order id' });
  }

  return next();
}

export async function loadOrderForCurrentUserOrAdmin(req, res, next) {
  try {
    const order = await Order.findById(req.params.id).lean();
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const isOwner = String(order.user) === String(req.currentUser.userId);
    if (!isOwner && req.currentUser.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    req.order = order;
    return next();
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch order', error: error.message });
  }
}
