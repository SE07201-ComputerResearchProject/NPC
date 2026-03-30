import express from 'express';
import FeaturedBuild from '../models/FeaturedBuild.js';
import { COMPONENT_CATEGORIES } from '../models/Component.js';
import { requireAdmin } from '../middleware/adminMiddleware.js';

const router = express.Router();
const VALID_TIERS = ['high', 'mid', 'budget'];
const VALID_PART_CATEGORIES = COMPONENT_CATEGORIES;

function normalizeParts(partsInput) {
  if (!partsInput || typeof partsInput !== 'object' || Array.isArray(partsInput)) {
    return {};
  }

  const normalized = {};
  for (const [key, value] of Object.entries(partsInput)) {
    if (!VALID_PART_CATEGORIES.includes(key)) {
      continue;
    }

    const name = String(value?.name || '').trim();
    if (!name) {
      continue;
    }

    normalized[key] = { name };
  }

  return normalized;
}

// ──────────────────────────────────────────────
//  Seed data
// ──────────────────────────────────────────────
const DEFAULT_FEATURED_BUILDS = [
  {
    presetId: 'overlord',
    name: 'The Overlord',
    tagline: 'AMD Ryzen 7 9800X3D + RX 9070 XT — 1440p beast with 3D V-Cache.',
    tier: 'high',
    estimatedPrice: '~55,248,000 ₫',
    order: 1,
    parts: {
      case:        { name: 'Lian Li O11 Dynamic Mini V2' },
      cpu:         { name: 'AMD Ryzen 7 9800X3D' },
      motherboard: { name: 'Asus B850 TUF GAMING PLUS WIFI DDR5 ATX' },
      gpu:         { name: 'Sapphire NITRO+ Radeon RX 9070 XT 16GB GDDR6' },
      ram:         { name: 'Crucial Pro Overclocking DDR5-6000 CL36 32GB' },
      cooler:      { name: 'MSI MAG CORELIQUID A13 Water 360mm' },
      storage:     { name: 'PNY CS2230 1TB NVMe PCIe 3.0' },
      psu:         { name: 'Montech CENTURY II 850W 80+ Gold' },
      fan:         { name: 'Asiahorse NYOTA 120mm Case Fans 3-Pack' },
    },
  },
  {
    presetId: 'architect',
    name: 'The Architect',
    tagline: 'Intel i7-13700K + RTX 4070 SUPER — creator & gaming powerhouse.',
    tier: 'high',
    estimatedPrice: '~53,519,000 ₫',
    order: 2,
    parts: {
      case:        { name: 'Corsair 4000D Airflow' },
      cpu:         { name: 'Intel Core i7-13700K' },
      motherboard: { name: 'ASUS TUF B760-PLUS WIFI' },
      gpu:         { name: 'NVIDIA GeForce RTX 4070 SUPER 12GB' },
      ram:         { name: 'TeamGroup T-Force Delta RGB 32GB DDR5-6000' },
      cooler:      { name: 'Lian Li Galahad II Trinity 360' },
      storage:     { name: 'WD Black SN850X 2TB' },
      psu:         { name: 'Seasonic Focus GX-850' },
      fan:         { name: 'Lian Li UNI FAN SL120 V2' },
    },
  },
  {
    presetId: 'starter',
    name: 'The Starter',
    tagline: 'AMD Ryzen 5 7600 + RX 7800 XT — best bang for buck at 1080p/1440p.',
    tier: 'mid',
    estimatedPrice: '~43,169,000 ₫',
    order: 3,
    parts: {
      case:        { name: 'NZXT H5 Flow' },
      cpu:         { name: 'AMD Ryzen 5 7600' },
      motherboard: { name: 'Gigabyte B650 AORUS ELITE AX' },
      gpu:         { name: 'AMD Radeon RX 7800 XT 16GB' },
      ram:         { name: 'Kingston Fury Beast 32GB DDR5-5600' },
      cooler:      { name: 'Corsair H100i Elite Capellix' },
      storage:     { name: 'Samsung 980 PRO 1TB' },
      psu:         { name: 'Corsair RM750x' },
      fan:         { name: 'Corsair AF120 RGB Elite' },
    },
  },
];

// ──────────────────────────────────────────────
//  Seed helper – called on server startup
// ──────────────────────────────────────────────
export async function seedFeaturedBuildsIfNeeded() {
  const count = await FeaturedBuild.countDocuments();
  if (count > 0) return;

  await FeaturedBuild.insertMany(DEFAULT_FEATURED_BUILDS);
  console.log(`✓ Seeded ${DEFAULT_FEATURED_BUILDS.length} featured builds`);
}

// ──────────────────────────────────────────────
//  GET /api/featured-builds
//  Returns all presets sorted by `order`
// ──────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const builds = await FeaturedBuild.find().sort({ order: 1 }).lean();
    res.json(builds);
  } catch (err) {
    res.status(500).json({ message: 'Failed to load featured builds' });
  }
});

// ──────────────────────────────────────────────
//  GET /api/featured-builds/:presetId
// ──────────────────────────────────────────────
router.get('/:presetId', async (req, res) => {
  try {
    const build = await FeaturedBuild.findOne({ presetId: req.params.presetId }).lean();
    if (!build) return res.status(404).json({ message: 'Preset not found' });
    res.json(build);
  } catch (err) {
    res.status(500).json({ message: 'Failed to load featured build' });
  }
});

// ──────────────────────────────────────────────
//  POST /api/featured-builds
// ──────────────────────────────────────────────
router.post('/', requireAdmin, async (req, res) => {
  try {
    const {
      presetId,
      name,
      tagline,
      tier,
      estimatedPrice,
      order,
      parts,
    } = req.body;

    const normalizedPresetId = String(presetId || '').trim();
    const normalizedName = String(name || '').trim();

    if (!normalizedPresetId || !normalizedName) {
      return res.status(400).json({ message: 'presetId and name are required' });
    }

    const normalizedTier = VALID_TIERS.includes(tier) ? tier : 'mid';
    const normalizedOrder = Number.isFinite(Number(order)) ? Number(order) : 0;

    const created = await FeaturedBuild.create({
      presetId: normalizedPresetId,
      name: normalizedName,
      tagline: String(tagline || '').trim(),
      tier: normalizedTier,
      estimatedPrice: String(estimatedPrice || '').trim(),
      order: normalizedOrder,
      parts: normalizeParts(parts),
    });

    res.status(201).json({ message: 'Featured build created successfully', featuredBuild: created });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: 'presetId already exists' });
    }
    res.status(500).json({ message: 'Failed to create featured build', error: error.message });
  }
});

// ──────────────────────────────────────────────
//  PUT /api/featured-builds/:id
// ──────────────────────────────────────────────
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const {
      presetId,
      name,
      tagline,
      tier,
      estimatedPrice,
      order,
      parts,
    } = req.body;

    const updateData = {};

    if (presetId !== undefined) updateData.presetId = String(presetId || '').trim();
    if (name !== undefined) updateData.name = String(name || '').trim();
    if (tagline !== undefined) updateData.tagline = String(tagline || '').trim();
    if (tier !== undefined) {
      if (!VALID_TIERS.includes(tier)) {
        return res.status(400).json({ message: 'Invalid tier value' });
      }
      updateData.tier = tier;
    }
    if (estimatedPrice !== undefined) updateData.estimatedPrice = String(estimatedPrice || '').trim();
    if (order !== undefined) updateData.order = Number.isFinite(Number(order)) ? Number(order) : 0;
    if (parts !== undefined) updateData.parts = normalizeParts(parts);

    if ('presetId' in updateData && !updateData.presetId) {
      return res.status(400).json({ message: 'presetId cannot be empty' });
    }
    if ('name' in updateData && !updateData.name) {
      return res.status(400).json({ message: 'name cannot be empty' });
    }

    const updated = await FeaturedBuild.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updated) {
      return res.status(404).json({ message: 'Featured build not found' });
    }

    res.status(200).json({ message: 'Featured build updated successfully', featuredBuild: updated });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: 'presetId already exists' });
    }
    res.status(500).json({ message: 'Failed to update featured build', error: error.message });
  }
});

// ──────────────────────────────────────────────
//  DELETE /api/featured-builds/:id
// ──────────────────────────────────────────────
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const deleted = await FeaturedBuild.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Featured build not found' });
    }

    res.status(200).json({ message: 'Featured build deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete featured build', error: error.message });
  }
});

export default router;
