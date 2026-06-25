require('express-async-errors');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const logger = require('./config/logger');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const requestIdMiddleware = require('./middleware/requestId');
const apiRouter = require('./routes');

const app = express();

// Trust proxy (for correct IP behind load balancer / reverse proxy)
app.set('trust proxy', 1);

// Security
app.use(helmet());

// CORS
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'X-Tenant-Id'],
  }),
);

// Compression
app.use(compression());

// Request ID
app.use(requestIdMiddleware);

// HTTP logging
app.use(
  morgan('combined', {
    stream: { write: (msg) => logger.info(msg.trim(), { source: 'http' }) },
    skip: (req) => req.path === '/health',
  }),
);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Global rate limiting
app.use(
  '/api',
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 min
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: { code: 'RATE_LIMIT', message: 'Too many requests' } },
  }),
);

// Routes
app.use('/api/v1', apiRouter);

// 404
app.use(notFound);

// Global error handler
app.use(errorHandler);

module.exports = app;
