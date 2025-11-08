require('dotenv').config();

// Initialize Sentry FIRST before any other imports
const sentryModule = require('./lib/sentry');
sentryModule.initializeSentry();

const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const debateRouter = require('./routes/debate');
const humanInputRouter = require('./routes/human-input');

const app = express();
const prisma = new PrismaClient();

// Sentry request handler must be the first middleware (only if Sentry is enabled)
if (sentryModule.isSentryEnabled) {
  app.use(sentryModule.Sentry.Handlers.requestHandler());
}

// CORS configuration - allow multiple origins
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001', 
  'https://app.decisionforge.io',
  'https://debate-panel.vercel.app',
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
  ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [])
];

// Middleware
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '50mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'debate-processor',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/debate', debateRouter);
app.use('/api/debate/human-input', humanInputRouter);

// Sentry tracing and error handlers (only if Sentry is enabled)
if (sentryModule.isSentryEnabled) {
  app.use(sentryModule.Sentry.Handlers.tracingHandler());
  app.use(sentryModule.Sentry.Handlers.errorHandler());
}

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);

  // Send error to Sentry if enabled and not already sent
  if (sentryModule.isSentryEnabled && !res.headersSent) {
    sentryModule.Sentry.captureException(err);
  }

  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'production' ? 'An error occurred' : err.message
  });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 Debate processor running on port ${PORT}`);
  console.log(`📡 Allowed origins:`);
  allowedOrigins.forEach(origin => console.log(`   - ${origin}`));
  console.log(`🗄️  Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});





