import mongoose from 'mongoose';

const logSchema = new mongoose.Schema({
  timeStamp: {
    type: Date,
    required: true,
    default: Date.now,
  },
  activity: {
    type: String,
    default: '',
  },
  user: {
    type: String,
    required: true,
  },
});
export default mongoose.model('Log', logSchema);