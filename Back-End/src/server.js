import featuredBuildRoutes from './routes/featuredBuildRoutes.js';
import { seedFeaturedBuildsIfNeeded } from './routes/featuredBuildRoutes.js';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import userRoutes from './routes/userRoutes.js';
import componentRoutes from './routes/componentRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import buildRoutes from './routes/buildRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import logRoutes from './routes/logRoutes.js';
import compatibilityRoutes from './routes/compatibilityRoutes.js';
import Component from './models/Component.js';
import Log from './models/Log.js'
import { seedComponentsIfNeeded } from './utils/componentData.js';
import { seedLogsIfNeeded } from './utils/logData.js';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
const mongoConnectionString = process.env.MONGODB_CONNECTION_STRING || 'mongodb://localhost:27017/npc';

// Routes
app.use('/api/users', userRoutes);
app.use('/api/components', componentRoutes);
app.use('/api/carts', cartRoutes);
app.use('/api/builds', buildRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/compatibility', compatibilityRoutes);
app.use('/api/featured-builds', featuredBuildRoutes);

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

// Start server only after MongoDB is connected
const PORT = process.env.PORT || 3000;
mongoose.connect(mongoConnectionString)
.then(async () => {
  console.log('✓ MongoDB connected');
  await seedComponentsIfNeeded(Component);
  await seedLogsIfNeeded(Log);
    await seedFeaturedBuildsIfNeeded();
// node or browser
  app.listen(PORT, async () => {
    console.log(`✓ Server running on port ${PORT}`);
    console.log(`Ready to process requests...`);

    await fetch(`http://localhost:${PORT}/api/logs/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: 'anon', activity: 'log entry injection 2' }),
    });

  });
})
.catch(err => console.error('✗ MongoDB connection error:', err.message));

