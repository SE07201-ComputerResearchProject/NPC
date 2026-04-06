import { COMPONENT_CATEGORIES } from '../models/Component.js';

function toSafeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toSafeString(value, fallback = '') {
  if (value === null || value === undefined) return fallback;
  return String(value).trim();
}

export function normalizeComponentSnapshot(value, { allowQuantity = false } = {}) {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const category = toSafeString(value.category).toLowerCase();
  const name = toSafeString(value.name);

  if (!category || !COMPONENT_CATEGORIES.includes(category) || !name) {
    return null;
  }

  const snapshot = {
    componentId: toSafeString(value.componentId || value._id),
    category,
    name,
    brand: toSafeString(value.brand),
    price: Math.max(0, toSafeNumber(value.price, 0)),
    power: Math.max(0, toSafeNumber(value.power, 0)),
    imageUrl: toSafeString(value.imageUrl),
    description: toSafeString(value.description),
  };

  if (allowQuantity) {
    snapshot.quantity = Math.max(1, Math.floor(toSafeNumber(value.quantity, 1)));
  }

  return snapshot;
}

export function normalizeCartItems(rawItems) {
  if (!Array.isArray(rawItems)) {
    return [];
  }

  return rawItems
    .map(item => normalizeComponentSnapshot(item, { allowQuantity: true }))
    .filter(Boolean);
}

export function normalizeBuildParts(rawParts = {}) {
  const normalized = {};

  COMPONENT_CATEGORIES.forEach(category => {
    normalized[category] = normalizeComponentSnapshot(rawParts?.[category]) || null;
  });

  return normalized;
}

export function buildPartsToItems(parts = {}) {
  return COMPONENT_CATEGORIES
    .map(category => parts?.[category])
    .filter(Boolean)
    .map(part => ({
      ...part,
      quantity: 1,
    }));
}

export function calculateItemsTotal(items = []) {
  return items.reduce((sum, item) => {
    return sum + Math.max(0, toSafeNumber(item.price, 0)) * Math.max(1, toSafeNumber(item.quantity, 1));
  }, 0);
}

export function hasAnyBuildParts(parts = {}) {
  return COMPONENT_CATEGORIES.some(category => Boolean(parts?.[category]));
}

export function mapComponentSnapshotForClient(snapshot) {
  if (!snapshot) return null;

  return {
    _id: snapshot.componentId || '',
    category: snapshot.category,
    name: snapshot.name,
    brand: snapshot.brand || '',
    price: Number(snapshot.price || 0),
    power: Number(snapshot.power || 0),
    imageUrl: snapshot.imageUrl || '',
    description: snapshot.description || '',
    quantity: snapshot.quantity !== undefined ? Number(snapshot.quantity || 1) : undefined,
  };
}

export function mapCartItemsForClient(items = []) {
  return items.map(item => mapComponentSnapshotForClient(item)).filter(Boolean);
}

export function mapBuildPartsForClient(parts = {}) {
  const mapped = {};

  COMPONENT_CATEGORIES.forEach(category => {
    mapped[category] = mapComponentSnapshotForClient(parts?.[category]);
  });

  return mapped;
}
