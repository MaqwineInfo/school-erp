require('express-async-errors');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const logger = require('./config/logger');
const config = require('./config/env');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const requestIdMiddleware = require('./middleware/requestId');
const readinessRouter = require('./platform/health/readiness');
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
    // X-Branch-Id and Idempotency-Key were documented in CLAUDE.md and required by the
    // fee-collection workflow, but were never in the allow-list — so the browser blocked
    // them. Architecture §16.
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Request-Id',
      'X-Tenant-Id',
      'X-Branch-Id',
      'Idempotency-Key',
    ],
    exposedHeaders: ['X-Request-Id', 'Idempotent-Replay'],
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

// Auth endpoints get their own, far stricter bucket (architecture §14.3). Must be
// registered BEFORE the global limiter so it wins for /auth/*.
app.use(
  ['/api/v1/auth', '/api/v1/public'],
  rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.authMax,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // only failed attempts count towards the limit
    message: {
      success: false,
      error: { code: 'RATE_LIMITED', message: 'Too many attempts, please try again later' },
    },
  }),
);

// Global rate limiting
app.use(
  '/api',
  rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests' } },
  }),
);

// Liveness / readiness (architecture §19).
// Mounted at the APP ROOT, not under /api/v1: `/api/v1/health` is already the student
// health-records module, and mounting probes there would shadow it.
app.use('/health', readinessRouter);

// Routes
app.use('/api/v1', apiRouter);

// 404
app.use(notFound);

// Global error handler
app.use(errorHandler);

module.exports = app;
