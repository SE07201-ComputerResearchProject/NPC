// routes/logs.js
import express from 'express';
import mongoose from 'mongoose';
import Log from './Log.js';

const router = express.Router();

/**
 * POST /logs
 * Create a system activity log.
 * Accepts JSON body: { user: string, activity?: string, timeStamp?: ISODate|string|number }
 */
router.post('/', async (req, res) => {
  try {
    const { user, activity = '', timeStamp } = req.body;

    // Basic validation
    if (!user || typeof user !== 'string' || user.trim() === '') {
      return res.status(400).json({ error: 'user is required and must be a non-empty string' });
    }

    // Normalize timestamp if provided
    let ts;
    if (timeStamp !== undefined && timeStamp !== null && timeStamp !== '') {
      ts = new Date(timeStamp);
      if (Number.isNaN(ts.getTime())) {
        return res.status(400).json({ error: 'timeStamp must be a valid date or ISO string' });
      }
    }

    const log = new Log({
      user: user.trim(),
      activity: typeof activity === 'string' ? activity.trim() : String(activity),
      timeStamp: ts, // if undefined, schema default Date.now will apply
    });

    const saved = await log.save();
    return res.status(201).json(saved.toObject());
  } catch (err) {
    if (err instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({ error: err.message });
    }
    console.error('Create log error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /logs
 * Read logs with optional filters, pagination and sorting.
 * Query params:
 *   user - filter by user string
 *   limit - number per page (default 50, max 200)
 *   page - page number (default 1)
 *   sort - mongoose sort string (default -timeStamp)
 */
router.get('/', async (req, res) => {
  try {
    const { user, limit = 50, page = 1, sort = '-timeStamp' } = req.query;

    const parsedLimit = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
    const parsedPage = Math.max(1, parseInt(page, 10) || 1);

    const filter = {};
    if (user) filter.user = user;

    const [data, total] = await Promise.all([
      Log.find(filter)
        .sort(sort)
        .skip((parsedPage - 1) * parsedLimit)
        .limit(parsedLimit)
        .lean()
        .exec(),
      Log.countDocuments(filter).exec(),
    ]);

    return res.json({
      page: parsedPage,
      limit: parsedLimit,
      total,
      data,
    });
  } catch (err) {
    console.error('List logs error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /logs/:id
 * Read single log by id
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid id' });
    }

    const doc = await Log.findById(id).lean().exec();
    if (!doc) return res.status(404).json({ error: 'Log not found' });

    return res.json(doc);
  } catch (err) {
    console.error('Get log error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
