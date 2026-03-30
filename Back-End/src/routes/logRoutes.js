import express from 'express';
import mongoose from 'mongoose';
import Log from '../models/Log.js';
import { requireAdmin } from '../middleware/adminMiddleware.js';

const router = express.Router();

// Create (POST /api/logs) — restricted to admins; app logic uses Log.create() directly
router.post('/', requireAdmin, async (req, res) => {
  const { user, activity = '' } = req.body;
  if (!user || typeof user !== 'string' || user.trim() === '') {
    return res.status(400).json({ error: 'user is required' });
  }
  try {
    const saved = await Log.create({ user: user.trim(), activity: activity.trim() });
    return res.status(201).json(saved);
  } catch (err) {
    if (err instanceof mongoose.Error.ValidationError) return res.status(400).json({ error: err.message });
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// List (GET /api/logs)
router.get('/', async (req, res) => {
  try {
    const docs = await Log.find().sort({ timeStamp: -1 }).limit(50).lean();
    res.json(docs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get by id (GET /api/logs/:id) — only match 24-hex ObjectId
router.get('/:id([0-9a-fA-F]{24})', async (req, res) => {
  try {
    const doc = await Log.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ error: 'Log not found' });
    res.json(doc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete single log (DELETE /api/logs/:id) — admin only
router.delete('/:id([0-9a-fA-F]{24})', requireAdmin, async (req, res) => {
  try {
    const doc = await Log.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Log not found' });
    return res.json({ deleted: 1 });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete all logs (DELETE /api/logs) — admin only
router.delete('/', requireAdmin, async (req, res) => {
  try {
    const result = await Log.deleteMany({});
    return res.json({ deleted: result.deletedCount });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
