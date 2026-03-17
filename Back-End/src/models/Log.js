// models/log.js
import mongoose from 'mongoose';

const logSchema = new mongoose.Schema({
  timeStamp: { type: Date, required: false, default: Date.now },
  activity: { type: String, default: 'N/A' },
  user: { type: String, required: true },
}, {
  collection: 'Log',
  timestamps: false,
});

export default mongoose.model('Log', logSchema);
