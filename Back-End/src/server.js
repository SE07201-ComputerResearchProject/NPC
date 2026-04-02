import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { GoogleGenerativeAI } from '@google/generative-ai';
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

// Gemini chat endpoint (server-side proxy)
app.post('/api/gemini', async (req, res) => {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!geminiApiKey && !openaiApiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY or OPENAI_API_KEY is required.' });
  }

  const question = (req.body.question || '').toString().trim();
  if (!question) {
    return res.status(400).json({ error: 'Question is required.' });
  }

  try {
    // If OpenAI key is available, use it as a fallback (works in this env and avoids Gemini TLS mismatch)
    if (openaiApiKey) {
      const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: process.env.GEMINI_PROMPT || 'You are a helpful assistant.' },
            { role: 'user', content: question }
          ],
          max_tokens: Number(process.env.OPENAI_MAX_TOKENS || 500),
          temperature: Number(process.env.OPENAI_TEMPERATURE || 0.5),
        }),
      });

      const openaiData = await openaiRes.json();
      if (!openaiRes.ok) {
        throw new Error(`OpenAI error: ${openaiData.error?.message || openaiRes.status}`);
      }

      return res.json({ answer: openaiData.choices?.[0]?.message?.content || '', raw: openaiData, provider: 'openai' });
    }

    // Otherwise use Gemini package
    const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    const castKey = geminiApiKey;
    const client = new GoogleGenerativeAI({ apiKey: castKey });
    const model = client.getGenerativeModel({ model: modelName });
    const chat = model.startChat({
      history: [{ role: 'user', parts: [{ text: question }] }],
    });

    const result = await chat.sendMessage(question);
    const answerText = result?.response?.text?.();

    if (!answerText) {
      return res.status(502).json({ error: 'Gemini model responded without answer', raw: result });
    }

    res.json({ answer: answerText, raw: result, provider: 'gemini' });
  } catch (error) {
    console.error('Gemini proxy error:', error);
    res.status(500).json({ error: 'Failed to connect to Gemini', detail: error.message, stack: error.stack });
  }
});

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

