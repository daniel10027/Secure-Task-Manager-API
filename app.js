// ─── app.js ───────────────────────────────────────────────────────────────────
// Express application setup: middleware stack, routes, error handling.
// This file configures the app but does NOT start the server.
// The server is started in server.js.

const express        = require('express');
const helmet         = require('helmet');
const mongoSanitize  = require('express-mongo-sanitize');
const xss            = require('xss-clean');
const rateLimit      = require('express-rate-limit');
const cookieParser   = require('cookie-parser');
const passport       = require('./config/passport');

const authRoutes     = require('./routes/authRoutes');
const taskRoutes     = require('./routes/taskRoutes');
const AppError       = require('./utils/AppError');
const errorHandler   = require('./middleware/errorHandler');

const app = express();

// ── 1. Security headers (helmet) ─────────────────────────────────────────────
// Sets various HTTP headers to protect against common web vulnerabilities
// (XSS, clickjacking, MIME sniffing, etc.)
app.use(helmet());

// ── 2. Body parsers ───────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));          // parse JSON bodies, max 10kb
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());                           // parse cookies (needed for JWT cookie)

// ── 3. Data sanitization ──────────────────────────────────────────────────────
// Prevent MongoDB operator injection (e.g. { "$gt": "" } in request body)
app.use(mongoSanitize());

// Prevent XSS attacks by sanitizing user input (strip HTML tags and JS)
app.use(xss());

// ── 4. Rate limiting ──────────────────────────────────────────────────────────
// General API rate limit: 100 requests per 15 minutes per IP
const generalLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             100,
  standardHeaders: true,
  legacyHeaders:   false,
  message: {
    status:  'fail',
    message: 'Too many requests from this IP. Please try again in 15 minutes.',
  },
});

// Strict rate limit on auth routes: 10 attempts per 15 minutes per IP
// Protects against brute-force login attacks
const authLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             10,
  standardHeaders: true,
  legacyHeaders:   false,
  message: {
    status:  'fail',
    message: 'Too many authentication attempts. Please try again in 15 minutes.',
  },
});

app.use('/api', generalLimiter);
app.use('/api/auth/login',  authLimiter);
app.use('/api/auth/signup', authLimiter);

// ── 5. Passport initialization ────────────────────────────────────────────────
app.use(passport.initialize());

// ── 6. Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',  authRoutes);
app.use('/api/tasks', taskRoutes);

// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status:  'success',
    message: 'Task Manager API is running',
    env:     process.env.NODE_ENV,
  });
});

// ── 7. Catch unmatched routes ─────────────────────────────────────────────────
// Any request that didn't match a route above lands here
app.all('*', (req, res, next) => {
  next(new AppError(`Route ${req.method} ${req.originalUrl} not found.`, 404));
});

// ── 8. Centralized error-handling middleware ──────────────────────────────────
// Must be LAST — Express identifies it by its 4-parameter signature (err, req, res, next)
app.use(errorHandler);

module.exports = app;
