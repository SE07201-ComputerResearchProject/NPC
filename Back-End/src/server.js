import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import userRoutes from './routes/userRoutes.js';
import componentRoutes from './routes/componentRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import buildRoutes from './routes/buildRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import logRoutes from './routes/logRoutes.js';
import compatibilityRoutes from './routes/compatibilityRoutes.js';
import featuredBuildRoutes, { seedFeaturedBuildsIfNeeded } from './routes/featuredBuildRoutes.js';
import Component from './models/Component.js';
import Log from './models/Log.js';
import { seedComponentsIfNeeded } from './utils/componentData.js';
import { seedLogsIfNeeded } from './utils/logData.js';
import { GoogleGenAI } from "@google/genai";
dotenv.config();

if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET environment variable is required');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// MongoDB Connection
const mongoConnectionString = process.env.MONGODB_CONNECTION_STRING || 'mongodb://localhost:27017/npc';
const mongooseOptions = {
  maxPoolSize: Number(process.env.MONGO_MAX_POOL_SIZE) || 20,
  minPoolSize: Number(process.env.MONGO_MIN_POOL_SIZE) || 5,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

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

async function handleChat(req, res) {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is required.' });
  }

  const question = (req.body.question || '').toString().trim();
  if (!question) {
    return res.status(400).json({ error: 'Question is required.' });
  }

  try {
    const genAI = new GoogleGenAI({ apiKey: geminiApiKey });
const result = await genAI.models.generateContent({
  model: "gemini-2.5-flash",
  contents: [{ text: question }]
});

let answer = 'No response from Gemini.';

if (typeof result.text === 'string') {
  answer = result.text;
} else if (result.response?.text) {
  answer = typeof result.response.text === 'function'
    ? result.response.text()
    : result.response.text;
} else if (Array.isArray(result.output)) {
  const maybe = result.output[0]?.content?.[0]?.text;
  if (maybe) answer = maybe;
}

res.json({ answer: answer.trim(), raw: result, provider: 'gemini' });
  } catch (error) {
    console.error('Gemini proxy error:', error);
    res.status(500).json({ error: 'Failed to connect to Gemini', detail: error.message, stack: error.stack });
  }
}

app.post('/api/gemini', handleChat);

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'E-Commerce API Server is running...' });
});

// Start server only after MongoDB is connected
const PORT = process.env.PORT || 3001;
mongoose.connect(mongoConnectionString, mongooseOptions)
.then(async () => {
  console.log('✓ MongoDB connected');
  await seedComponentsIfNeeded(Component);
  await seedLogsIfNeeded(Log);
    await seedFeaturedBuildsIfNeeded();
// node or browser
  app.listen(PORT, async () => {
    console.log(`✓ Server running on port ${PORT}`);
    console.log(`Ready to process requests...`);
  });
})
.catch(err => console.error('✗ MongoDB connection error:', err.message));

