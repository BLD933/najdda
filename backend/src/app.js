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

const app = express();

// Middlewares
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
// Images selected in the mobile app are sent as Base64. The Express default
// body limit (100 kb) is too small even for a compressed phone photo.
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/pregnancy', pregnancyRoutes);
app.use('/api/allergy', allergyRoutes);
app.use('/api/children', childRoutes);
app.use('/api/medications', drugRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/orchestrator', orchestratorRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

module.exports = app;
