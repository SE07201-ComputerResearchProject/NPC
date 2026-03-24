import mongoose from 'mongoose';

const VALID_CATEGORIES = ['case', 'cpu', 'motherboard', 'gpu', 'ram', 'cooler', 'storage', 'psu', 'fan'];

const presetPartSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const featuredBuildSchema = new mongoose.Schema(
  {
    presetId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    tagline: {
      type: String,
      default: '',
      trim: true,
    },
    tier: {
      type: String,
      enum: ['high', 'mid', 'budget'],
      default: 'mid',
    },
    estimatedPrice: {
      type: String,
      default: '',
      trim: true,
    },
    parts: {
      type: Map,
      of: presetPartSchema,
      default: {},
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Validate that all part keys belong to valid categories
featuredBuildSchema.path('parts').validate(function (partsMap) {
  if (!partsMap) return true;
  for (const key of partsMap.keys()) {
    if (!VALID_CATEGORIES.includes(key)) return false;
  }
  return true;
}, 'parts contains an invalid category key');

const FeaturedBuild = mongoose.model('FeaturedBuild', featuredBuildSchema);
export default FeaturedBuild;
