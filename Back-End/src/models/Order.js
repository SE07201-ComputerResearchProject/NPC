import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema(
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
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
  },
  {
    _id: false,
  }
);

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    source: {
      type: String,
      enum: ['cart', 'build'],
      required: true,
    },
    buildName: {
      type: String,
      trim: true,
      default: '',
    },
    items: {
      type: [orderItemSchema],
      default: [],
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    pricing: {
      subtotal: {
        type: Number,
        default: 0,
        min: 0,
      },
      shipping: {
        type: Number,
        default: 0,
        min: 0,
      },
      discountAmount: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
    voucher: {
      code: {
        type: String,
        default: '',
        trim: true,
        uppercase: true,
      },
      discountPercent: {
        type: Number,
        default: 0,
        min: 0,
      },
      maxDiscount: {
        type: Number,
        default: 0,
        min: 0,
      },
      discountAmount: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
    currency: {
      type: String,
      default: 'VND',
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'cancelled'],
      default: 'pending',
      index: true,
    },
    orderInfo: {
      type: String,
      trim: true,
      default: '',
    },
    payment: {
      provider: {
        type: String,
        default: '',
        trim: true,
      },
      txnRef: {
        type: String,
        default: '',
        trim: true,
        index: true,
      },
      responseCode: {
        type: String,
        default: '',
        trim: true,
      },
      requestedAt: {
        type: Date,
        default: null,
      },
      paidAt: {
        type: Date,
        default: null,
      },
      returnedAt: {
        type: Date,
        default: null,
      },
    },
    shippingAddress: {
      street: {
        type: String,
        trim: true,
        default: '',
      },
      city: {
        type: String,
        trim: true,
        default: '',
      },
      state: {
        type: String,
        trim: true,
        default: '',
      },
      zip: {
        type: String,
        trim: true,
        default: '',
      },
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('Order', orderSchema);
