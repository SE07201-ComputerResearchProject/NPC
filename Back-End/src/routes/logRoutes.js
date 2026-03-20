import express from 'express';
import mongoose from 'mongoose';
import Log from '../models/Log.js';

const router = express.Router();

// Create (POST /api/logs)
router.post('/', async (req, res) => {
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
  const docs = await Log.find().sort({ timeStamp: -1 }).limit(50).lean();
  res.json(docs);
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

export default router;
