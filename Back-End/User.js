import mongoose from 'mongoose';
import bcryptjs from 'bcryptjs';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  provider: {
    type: String,
    enum: ['local', 'google'],
    default: 'local',
    index: true,
  },
  googleId: {
    type: String,
    default: '',
    index: true,
  },
  password: {
    type: String,
    required: function () {
      return this.provider !== 'google';
    },
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
    index: true,
  },
  fullName: {
    type: String,
    trim: true,
    default: '',
  },
  avatarUrl: {
    type: String,
    trim: true,
    default: '',
  },
  dateOfBirth: {
    type: Date,
    default: null,
  },
  address: {
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
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.password || !this.isModified('password')) return next();
  try {
    const salt = await bcryptjs.genSalt(10);
    this.password = await bcryptjs.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(plainPassword) {
  if (!this.password) return false;
  return await bcryptjs.compare(plainPassword, this.password);
};

export default mongoose.model('User', userSchema);
