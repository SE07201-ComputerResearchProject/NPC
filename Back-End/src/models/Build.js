import mongoose from 'mongoose';

const buildPartSchema = new mongoose.Schema(
  {
    componentId: {
      type: String,
      default: '',
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    brand: {
      type: String,
      default: '',
      trim: true,
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
  },
  {
    _id: false,
  }
);

const buildSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      trim: true,
      default: 'New Build',
    },
    parts: {
      case: { type: buildPartSchema, default: null },
      cpu: { type: buildPartSchema, default: null },
      motherboard: { type: buildPartSchema, default: null },
      gpu: { type: buildPartSchema, default: null },
      ram: { type: buildPartSchema, default: null },
      storage: { type: buildPartSchema, default: null },
      psu: { type: buildPartSchema, default: null },
      cooler: { type: buildPartSchema, default: null },
      fan: { type: buildPartSchema, default: null },
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('Build', buildSchema);
