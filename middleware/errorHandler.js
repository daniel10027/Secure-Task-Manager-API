// ─── middleware/errorHandler.js ───────────────────────────────────────────────
// Centralized error-handling middleware.
// Express recognizes this as an error handler because it has 4 parameters.
// It is registered LAST in app.js, after all routes.
//
// Handles:
//   - AppError (operational errors we created intentionally)
//   - Mongoose validation errors
//   - Mongoose duplicate key errors
//   - Mongoose CastError (invalid ObjectId)
//   - JWT errors (already handled in verifyToken, but as a safety net)
//   - Generic unexpected errors

const AppError = require('../utils/AppError');

// ── Mongoose-specific error transformers ──────────────────────────────────────

// Invalid MongoDB ObjectId (e.g. /tasks/not-a-valid-id)
const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: "${err.value}"`;
  return new AppError(message, 400);
};

// Duplicate unique field (e.g. email already exists)
const handleDuplicateFieldsDB = (err) => {
  const field = Object.keys(err.keyValue)[0];
  const value = err.keyValue[field];
  const message = `Duplicate value "${value}" for field "${field}". Please use a different value.`;
  return new AppError(message, 400);
};

// Mongoose validation errors (required fields, min/maxlength…)
const handleValidationErrorDB = (err) => {
  const errors  = Object.values(err.errors).map((e) => e.message);
  const message = `Validation failed: ${errors.join('. ')}`;
  return new AppError(message, 400);
};

// ── Main error handler ────────────────────────────────────────────────────────
const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status     = err.status     || 'error';

  if (process.env.NODE_ENV === 'development') {
    // Development: send full error details for debugging
    return res.status(err.statusCode).json({
      status:     err.status,
      message:    err.message,
      stack:      err.stack,
      error:      err,
    });
  }

  // Production: transform specific error types, hide internal details
  let error = { ...err, message: err.message, name: err.name };

  if (error.name === 'CastError')              error = handleCastErrorDB(error);
  if (error.code === 11000)                    error = handleDuplicateFieldsDB(error);
  if (error.name === 'ValidationError')        error = handleValidationErrorDB(error);

  if (error.isOperational) {
    // Known operational error — safe to send details to client
    return res.status(error.statusCode).json({
      status:  error.status,
      message: error.message,
    });
  }

  // Unknown programming error — log it and send a generic message
  console.error('UNEXPECTED ERROR:', err);
  return res.status(500).json({
    status:  'error',
    message: 'Something went wrong. Please try again later.',
  });
};

module.exports = errorHandler;
