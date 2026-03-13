import express from 'express';
import Component, { COMPONENT_CATEGORIES } from './Component.js';

const router = express.Router();

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

    if (category && COMPONENT_CATEGORIES.includes(category)) {
      filter.category = category;
    }

    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { brand: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
      ];
    }

    const components = await Component.find(filter).sort({ category: 1, price: 1 });
    res.status(200).json(components);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch components', error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const component = await Component.findById(req.params.id);
    if (!component) {
      return res.status(404).json({ message: 'Component not found' });
    }

    res.status(200).json(component);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch component', error: error.message });
  }
});

export default router;