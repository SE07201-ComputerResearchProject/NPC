import express from 'express';
import Build from '../models/Build.js';
import { requireAuth } from '../middleware/adminMiddleware.js';
import { validateBuildPayload } from '../middleware/commerceMiddleware.js';
import { mapBuildPartsForClient, normalizeBuildParts } from '../utils/commerceUtils.js';

const router = express.Router();

router.get('/me/current', requireAuth, async (req, res) => {
  try {
    const build = await Build.findOne({ user: req.currentUser.userId }).lean();

    return res.status(200).json({
      name: build?.name || 'New Build',
      parts: mapBuildPartsForClient(build?.parts || {}),
      updatedAt: build?.updatedAt || null,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch build', error: error.message });
  }
});

router.put('/me/current', requireAuth, validateBuildPayload, async (req, res) => {
  try {
    const name = req.validatedBuildName;
    const parts = req.validatedBuildParts;

    const build = await Build.findOneAndUpdate(
      { user: req.currentUser.userId },
      { name, parts },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    ).lean();

    return res.status(200).json({
      message: 'Build updated successfully',
      build: {
        name: build.name || 'New Build',
        parts: mapBuildPartsForClient(build.parts || {}),
        updatedAt: build.updatedAt || null,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update build', error: error.message });
  }
});

router.delete('/me/current', requireAuth, async (req, res) => {
  try {
    const build = await Build.findOneAndUpdate(
      { user: req.currentUser.userId },
      { name: 'New Build', parts: normalizeBuildParts({}) },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    ).lean();

    return res.status(200).json({
      message: 'Build cleared successfully',
      build: {
        name: build.name || 'New Build',
        parts: mapBuildPartsForClient(build.parts || {}),
        updatedAt: build.updatedAt || null,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to clear build', error: error.message });
  }
});

export default router;
