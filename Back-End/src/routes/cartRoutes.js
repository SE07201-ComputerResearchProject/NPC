import express from 'express';
import Cart from '../models/Cart.js';
import { requireAuth } from '../middleware/adminMiddleware.js';
import { validateCartPayload } from '../middleware/commerceMiddleware.js';
import { mapCartItemsForClient } from '../utils/commerceUtils.js';

const router = express.Router();

router.get('/me', requireAuth, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.currentUser.userId }).lean();
    return res.status(200).json({
      items: mapCartItemsForClient(cart?.items || []),
      updatedAt: cart?.updatedAt || null,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch cart', error: error.message });
  }
});

router.put('/me', requireAuth, validateCartPayload, async (req, res) => {
  try {
    const items = req.validatedCartItems;

    const cart = await Cart.findOneAndUpdate(
      { user: req.currentUser.userId },
      { items },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    ).lean();

    return res.status(200).json({
      message: 'Cart updated successfully',
      cart: {
        items: mapCartItemsForClient(cart.items || []),
        updatedAt: cart.updatedAt || null,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update cart', error: error.message });
  }
});

router.delete('/me', requireAuth, async (req, res) => {
  try {
    const cart = await Cart.findOneAndUpdate(
      { user: req.currentUser.userId },
      { items: [] },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    ).lean();

    return res.status(200).json({
      message: 'Cart cleared successfully',
      cart: {
        items: mapCartItemsForClient(cart.items || []),
        updatedAt: cart.updatedAt || null,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to clear cart', error: error.message });
  }
});

export default router;
