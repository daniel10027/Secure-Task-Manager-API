// ─── middleware/verifyToken.js ────────────────────────────────────────────────
// Protects private routes by verifying the JWT sent by the client.
// The token can be sent in two ways:
//   1. HTTP-only cookie named "jwt" (recommended — XSS-safe)
//   2. Authorization header: "Bearer <token>" (for API clients / testing)
//
// If the token is valid, the decoded user payload is attached to req.user
// and the request continues to the next middleware / route handler.
// If the token is missing or invalid, an AppError is returned immediately.

const jwt      = require('jsonwebtoken');
const User     = require('../models/User');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

const verifyToken = catchAsync(async (req, res, next) => {
  // 1. Extract the token
  let token;

  if (req.cookies && req.cookies.jwt) {
    // Preferred: read from HTTP-only cookie
    token = req.cookies.jwt;
  } else if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    // Fallback: read from Authorization header
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new AppError('You are not logged in. Please log in to get access.', 401));
  }

  // 2. Verify the token signature and expiry
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new AppError('Your session has expired. Please log in again.', 401));
    }
    return next(new AppError('Invalid token. Please log in again.', 401));
  }

  // 3. Check the user still exists in the database
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(new AppError('The user belonging to this token no longer exists.', 401));
  }

  // 4. Attach user to request and continue
  req.user = currentUser;
  next();
});

module.exports = verifyToken;
