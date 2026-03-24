// ─── routes/authRoutes.js ─────────────────────────────────────────────────────
const express    = require('express');
const jwt        = require('jsonwebtoken');
const passport   = require('passport');
const User       = require('../models/User');
const AppError   = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

const router = express.Router();

// ── Helper: sign JWT and send it as an HTTP-only cookie ───────────────────────
const createAndSendToken = (user, statusCode, res, message = 'Success') => {
  const token = jwt.sign(
    { id: user._id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  // Store JWT in an HTTP-only cookie (not accessible via JavaScript → XSS-safe)
  res.cookie('jwt', token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'strict',
    maxAge:   (parseInt(process.env.JWT_COOKIE_EXPIRES_IN) || 7) * 24 * 60 * 60 * 1000,
  });

  // Remove password from output
  user.password = undefined;

  res.status(statusCode).json({
    status:  'success',
    message,
    token,   // also send in response body for API clients / testing
    data: { user },
  });
};

// ────────────────────────────────────────────────────────────────────────────
// POST /api/auth/signup
// ────────────────────────────────────────────────────────────────────────────
router.post(
  '/signup',
  catchAsync(async (req, res, next) => {
    const { name, email, password } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return next(new AppError('Name, email, and password are required.', 400));
    }

    // Check if email is already registered
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(new AppError('An account with this email already exists.', 400));
    }

    // Create user (password is hashed automatically by the pre-save hook)
    const user = await User.create({ name, email, password });

    createAndSendToken(user, 201, res, 'Account created successfully');
  })
);

// ────────────────────────────────────────────────────────────────────────────
// POST /api/auth/login
// ────────────────────────────────────────────────────────────────────────────
router.post(
  '/login',
  catchAsync(async (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(new AppError('Please provide email and password.', 400));
    }

    // Find user — include password field (excluded by default via select: false)
    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.correctPassword(password, user.password))) {
      // Use the same message for both cases to avoid email enumeration
      return next(new AppError('Incorrect email or password.', 401));
    }

    createAndSendToken(user, 200, res, 'Logged in successfully');
  })
);

// ────────────────────────────────────────────────────────────────────────────
// POST /api/auth/logout
// ────────────────────────────────────────────────────────────────────────────
router.post('/logout', (req, res) => {
  // Overwrite the jwt cookie with an expired one
  res.cookie('jwt', 'loggedout', {
    httpOnly: true,
    expires:  new Date(Date.now() + 1000), // expires in 1 second
  });
  res.status(200).json({ status: 'success', message: 'Logged out successfully' });
});

// ────────────────────────────────────────────────────────────────────────────
// GET /api/auth/google — redirect to Google consent screen
// ────────────────────────────────────────────────────────────────────────────
router.get(
  '/google',
  passport.authenticate('google', {
    scope:   ['profile', 'email'],
    session: false,
  })
);

// ────────────────────────────────────────────────────────────────────────────
// GET /api/auth/google/callback — Google redirects here after user consents
// ────────────────────────────────────────────────────────────────────────────
router.get(
  '/google/callback',
  passport.authenticate('google', {
    session:      false,
    failureRedirect: '/api/auth/google/failure',
  }),
  (req, res) => {
    // req.user was set by Passport's Google strategy
    createAndSendToken(req.user, 200, res, 'Logged in with Google successfully');
  }
);

router.get('/google/failure', (req, res) => {
  res.status(401).json({ status: 'fail', message: 'Google authentication failed.' });
});

module.exports = router;
