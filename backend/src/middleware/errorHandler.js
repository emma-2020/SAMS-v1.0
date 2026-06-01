// src/middleware/errorHandler.js
'use strict';

const { AppError } = require('../utils/errors');

/**
 * Global Express error handler.
 * Must be registered LAST in app.js (after all routes).
 *
 * Catches:
 *  - AppError subclasses (BadRequestError, UnauthorizedError, etc.)
 *  - Unexpected errors (Supabase SDK errors, unhandled exceptions)
 *
 * Never leaks stack traces in production.
 */
function errorHandler(err, req, res, next) {  // eslint-disable-line no-unused-vars
  const isDev = process.env.NODE_ENV === 'development';

  // Known operational error
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error:   err.message,
      ...(isDev && { stack: err.stack }),
    });
  }

  // Unknown / programming error — log fully, expose minimally
  console.error('[Unhandled Error]', err);

  return res.status(500).json({
    success: false,
    error:   'An unexpected internal error occurred.',
    ...(isDev && { detail: err.message, stack: err.stack }),
  });
}

/**
 * 404 handler — register before errorHandler, after all routes.
 */
function notFound(req, res) {
  res.status(404).json({
    success: false,
    error:   `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

module.exports = { errorHandler, notFound };
