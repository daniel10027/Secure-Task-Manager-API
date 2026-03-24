// ─── utils/AppError.js ────────────────────────────────────────────────────────
// A reusable custom error class that extends the native Error object.
// Allows us to attach a statusCode and an isOperational flag to every error,
// so the centralized error handler knows how to format and send the response.

class AppError extends Error {
  /**
   * @param {string} message    - Human-readable error description
   * @param {number} statusCode - HTTP status code (400, 401, 403, 404, 500…)
   */
  constructor(message, statusCode) {
    super(message); // sets this.message

    this.statusCode  = statusCode;
    this.status      = `${statusCode}`.startsWith('4') ? 'fail' : 'error';

    // isOperational = true means it's a known, expected error (bad input, not found…)
    // isOperational = false means it's an unexpected programming error
    this.isOperational = true;

    // Capture the stack trace, excluding the constructor call itself
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
