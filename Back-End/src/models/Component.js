import mongoose from 'mongoose';

export const COMPONENT_CATEGORIES = [
  'case',
  'cpu',
  'motherboard',
  'gpu',
  'ram',
  'storage',
  'psu',
  'cooler',
  'fan',
];

const componentSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: true,
      enum: COMPONENT_CATEGORIES,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    brand: {
      type: String,
      trim: true,
      default: '',
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    power: {
      type: Number,
      default: 0,
      min: 0,
    },
    stock: {
      type: Number,
      default: 0,
      min: 0,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    highlights: {
      type: [String],
      default: [],
    },
    imageUrl: {
      type: String,
      trim: true,
      default: '',
    },
    specs: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    aiCompatibility: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

componentSchema.index({ category: 1, name: 1 }, { unique: true });

export default mongoose.model('Component', componentSchema);