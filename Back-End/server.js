import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import userRoutes from './userRoutes.js';
import componentRoutes from './componentRoutes.js';
import paymentRoutes from './paymentRoutes.js';
import Component from './Component.js';
import { seedComponentsIfNeeded } from './componentData.js';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
const mongoConnectionString = process.env.MONGODB_CONNECTION_STRING || 'mongodb://localhost:27017/npc';

mongoose.connect(mongoConnectionString)
.then(async () => {
  console.log('✓ MongoDB connected');
  await seedComponentsIfNeeded(Component);
})
.catch(err => console.error('✗ MongoDB connection error:', err.message));

// Routes
app.use('/api/users', userRoutes);
app.use('/api/components', componentRoutes);
app.use('/api/payments', paymentRoutes);

app.get('/api/config/public', (req, res) => {
  res.status(200).json({
    recaptchaSiteKey: process.env.RECAPTCHA_SITE_KEY || '',
    googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  });
});

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'E-Commerce API Server is running...' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✓ Server running on port ${PORT}`);
  console.log(`Ready to process requests...`);
});
