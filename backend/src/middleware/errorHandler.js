const logger = require('../config/logger');
const { AppError } = require('../shared/errors');

/**
 * Global error handler — maps every thrown error to the standard envelope
 * `{ success: false, error: { code, message, details } }` (architecture §16).
 *
 * ORDER MATTERS. `AppError` is checked FIRST because our own `ValidationError` sets
 * `name = 'ValidationError'`, which collides with Mongoose's. The previous version tested
 * `err.name === 'ValidationError'` before the AppError branch and then ran
 * `Object.values(err.errors)` — undefined on our class — so it threw *inside* the error
 * handler, Express fell back to its default handler, and every zod validation failure came
 * back as a 500 with an empty body instead of a 400 with per-field detail.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // ── Our own operational errors ─────────────────────────────────────────────
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error('Operational error', { error: err.message, stack: err.stack, requestId: req.requestId });
    }
    return res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message, details: err.details || [] },
    });
  }

  // ── Mongoose validation (has an `errors` map; ours does not) ───────────────
  if (err.name === 'ValidationError' && err.errors) {
    const details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details },
    });
  }

  // ── MongoDB duplicate key ──────────────────────────────────────────────────
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    return res.status(409).json({
      success: false,
      error: { code: 'CONFLICT', message: `${field} already exists`, details: [{ field }] },
    });
  }

  // ── JWT ────────────────────────────────────────────────────────────────────
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHENTICATED', message: 'Invalid or expired token', details: [] },
    });
  }

  // ── Invalid ObjectId ───────────────────────────────────────────────────────
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: `Invalid ${err.path}: ${err.value}`, details: [{ field: err.path }] },
    });
  }

  // ── Malformed JSON body ────────────────────────────────────────────────────
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Request body is not valid JSON', details: [] },
    });
  }

  // ── Anything else ──────────────────────────────────────────────────────────
  logger.error('Unexpected error', {
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    requestId: req.requestId,
  });

  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL',
      message: 'Something went wrong',
      details: [],
      // Correlates the response with the log line without leaking the stack.
      requestId: req.requestId,
    },
  });
}

function notFound(req, res) {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.originalUrl} not found`, details: [] },
  });
}

module.exports = { errorHandler, notFound };
