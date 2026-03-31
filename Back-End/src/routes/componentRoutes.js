import express from 'express';
import Component, { COMPONENT_CATEGORIES } from '../models/Component.js';
import { requireAdmin } from '../middleware/adminMiddleware.js';

const router = express.Router();

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeImageUrls(imageUrls, imageUrl) {
  const fromArray = Array.isArray(imageUrls)
    ? imageUrls.map(item => String(item || '').trim()).filter(Boolean)
    : [];

  if (fromArray.length > 0) {
    return fromArray;
  }

  const single = String(imageUrl || '').trim();
  return single ? [single] : [];
}

router.get('/categories', async (req, res) => {
  try {
    const counts = await Component.aggregate([
      {
        $group: {
          _id: '$category',
          total: { $sum: 1 },
        },
      },
    ]);

    const countMap = new Map(counts.map(item => [item._id, item.total]));
    const categories = COMPONENT_CATEGORIES.map(category => ({
      key: category,
      total: countMap.get(category) || 0,
    }));

    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch categories', error: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const { category, q } = req.query;
    const filter = {};
    const queryText = String(q || '').trim();

    if (category && COMPONENT_CATEGORIES.includes(category)) {
      filter.category = category;
    }

    if (queryText.length >= 2) {
      filter.$text = { $search: queryText };
    } else if (queryText) {
      const safeQuery = escapeRegex(queryText);
      filter.$or = [
        { name: { $regex: safeQuery, $options: 'i' } },
        { brand: { $regex: safeQuery, $options: 'i' } },
        { description: { $regex: safeQuery, $options: 'i' } },
      ];
    }

    let components;

    if (filter.$text) {
      components = await Component.aggregate([
        { $match: filter },
        { $addFields: { score: { $meta: 'textScore' } } },
        { $sort: { score: -1, price: 1 } },
        { $project: { __v: 0, score: 0 } },
      ]);
    } else {
      components = await Component.find(filter)
        .sort({ category: 1, price: 1 })
        .select('-__v')
        .lean();
    }

    res.status(200).json(components);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch components', error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const component = await Component.findById(req.params.id).select('-__v').lean();
    if (!component) {
      return res.status(404).json({ message: 'Component not found' });
    }

    res.status(200).json(component);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch component', error: error.message });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const {
      category,
      name,
      brand,
      price,
      power,
      stock,
      description,
      highlights,
      imageUrl,
      imageUrls,
      specs,
      aiCompatibility,
    } = req.body;

    if (!category || !name || price === undefined) {
      return res.status(400).json({ message: 'category, name, and price are required' });
    }

    if (!COMPONENT_CATEGORIES.includes(category)) {
      return res.status(400).json({ message: 'Invalid component category' });
    }

    const exists = await Component.exists({ category, name });
    if (exists) {
      return res.status(409).json({ message: 'Component already exists in this category' });
    }

    const normalizedImageUrls = normalizeImageUrls(imageUrls, imageUrl);

    const component = await Component.create({
      category,
      name,
      brand: brand || '',
      price: Number(price),
      power: Number(power || 0),
      stock: Number(stock || 0),
      description: description || '',
      highlights: Array.isArray(highlights) ? highlights : [],
      imageUrl: normalizedImageUrls[0] || '',
      imageUrls: normalizedImageUrls,
      specs: specs && typeof specs === 'object' ? specs : {},
      aiCompatibility: aiCompatibility && typeof aiCompatibility === 'object' ? aiCompatibility : {},
    });

    res.status(201).json({ message: 'Component created successfully', component });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create component', error: error.message });
  }
});

router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const {
      category,
      name,
      brand,
      price,
      power,
      stock,
      description,
      highlights,
      imageUrl,
      imageUrls,
      specs,
      aiCompatibility,
    } = req.body;

    if (category && !COMPONENT_CATEGORIES.includes(category)) {
      return res.status(400).json({ message: 'Invalid component category' });
    }

    const updateData = {};
    if (category !== undefined) updateData.category = category;
    if (name !== undefined) updateData.name = name;
    if (brand !== undefined) updateData.brand = brand;
    if (price !== undefined) updateData.price = Number(price);
    if (power !== undefined) updateData.power = Number(power);
    if (stock !== undefined) updateData.stock = Number(stock);
    if (description !== undefined) updateData.description = description;
    if (highlights !== undefined) updateData.highlights = Array.isArray(highlights) ? highlights : [];
    if (imageUrls !== undefined || imageUrl !== undefined) {
      const normalizedImageUrls = normalizeImageUrls(imageUrls, imageUrl);
      updateData.imageUrls = normalizedImageUrls;
      updateData.imageUrl = normalizedImageUrls[0] || '';
    }
    if (specs !== undefined) updateData.specs = specs && typeof specs === 'object' ? specs : {};
    if (aiCompatibility !== undefined) {
      updateData.aiCompatibility = aiCompatibility && typeof aiCompatibility === 'object' ? aiCompatibility : {};
    }

    const component = await Component.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!component) {
      return res.status(404).json({ message: 'Component not found' });
    }

    res.status(200).json({ message: 'Component updated successfully', component });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update component', error: error.message });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const component = await Component.findByIdAndDelete(req.params.id);
    if (!component) {
      return res.status(404).json({ message: 'Component not found' });
    }

    res.status(200).json({ message: 'Component deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete component', error: error.message });
  }
});

export default router;