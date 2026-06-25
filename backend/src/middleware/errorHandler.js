const logger = require('../config/logger');
const { AppError } = require('../shared/errors');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details },
    });
  }

  // MongoDB duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    return res.status(409).json({
      success: false,
      error: { code: 'DUPLICATE_KEY', message: `${field} already exists`, details: [] },
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token', details: [] },
    });
  }

  // CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_ID', message: `Invalid ${err.path}: ${err.value}`, details: [] },
    });
  }

  // Operational errors (thrown intentionally)
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error('Operational error', { error: err.message, stack: err.stack });
    }
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details || [],
      },
    });
  }

  // Unexpected errors
  logger.error('Unexpected error', { error: err.message, stack: err.stack, url: req.url });
  return res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'Something went wrong', details: [] },
  });
}

function notFound(req, res) {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.url} not found`, details: [] },
  });
}

module.exports = { errorHandler, notFound };
