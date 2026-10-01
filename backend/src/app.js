const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const authRoutes = require('./api/routes/authRoutes');
const profileRoutes = require('./api/routes/profileRoutes');
const chatRoutes = require('./api/routes/chatRoutes');
const pregnancyRoutes = require('./api/routes/pregnancyRoutes');
const allergyRoutes = require('./api/routes/allergyRoutes');
const childRoutes = require('./api/routes/childRoutes');
const drugRoutes = require('./api/routes/drugRoutes');
const conversationRoutes = require('./api/routes/conversationRoutes');
const orchestratorRoutes = require('./api/routes/orchestratorRoutes');
const voiceRoutes = require('./api/routes/voiceRoutes');

const app = express();

// Middlewares
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", 'https://api.fda.gov', 'https://api.groq.com'],
      imgSrc: ["'self'", 'data:'],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  },
  hsts: process.env.NODE_ENV === 'production' ? { maxAge: 15552000, includeSubDomains: true } : false,
}));
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173').split(',').map((s) => s.trim()).filter(Boolean);
app.use(cors({ origin: allowedOrigins, methods: ['GET', 'POST', 'PUT', 'DELETE'], allowedHeaders: ['Content-Type', 'Authorization'], maxAge: 600 }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
// Images selected in the mobile app are sent as Base64. The Express default
// body limit (100 kb) is too small even for a compressed phone photo.
app.use(express.json({ limit: '10mb' }));

const rateLimit = require('express-rate-limit');
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 20 }));
const llmLimiter = rateLimit({ windowMs: 60 * 1000, max: 30 });
app.use('/api/orchestrator', llmLimiter);
app.use('/api/chat', llmLimiter);
app.use('/api/voice', rateLimit({ windowMs: 60 * 1000, max: 20 }));
app.use('/api/pregnancy', llmLimiter);
app.use('/api/allergy', llmLimiter);
app.use('/api/children', llmLimiter);
app.use('/api/medications', llmLimiter);

// Routes
app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/pregnancy', pregnancyRoutes);
app.use('/api/allergy', allergyRoutes);
app.use('/api/children', childRoutes);
app.use('/api/medications', drugRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/orchestrator', orchestratorRoutes);
app.use('/api/voice', voiceRoutes);

// Error handling middleware
app.use((req, res) => {
  res.status(404).json({ message: 'Not found' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (process.env.NODE_ENV !== 'production') console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

module.exports = app;
