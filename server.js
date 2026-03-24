// ─── server.js ────────────────────────────────────────────────────────────────
// Entry point: loads env variables, connects to MongoDB, starts the HTTP server.
// Handles uncaught exceptions and unhandled promise rejections globally.

'use strict';

// Load environment variables FIRST — before any other imports
require('dotenv').config();

const mongoose = require('mongoose');
const app      = require('./app');

const PORT     = process.env.PORT     || 3000;
const MONGO_URI = process.env.MONGO_URI;

// ── Guard: required environment variables ────────────────────────────────────
if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET is not defined in environment variables.');
  process.exit(1);
}
if (!MONGO_URI) {
  console.error('FATAL: MONGO_URI is not defined in environment variables.');
  process.exit(1);
}

// ── Handle uncaught synchronous exceptions ────────────────────────────────────
// These are programming errors — log and shut down gracefully
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION — shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
});

// ── Connect to MongoDB ────────────────────────────────────────────────────────
mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB connected successfully');

    // ── Start HTTP server only after DB is ready ──────────────────────────────
    const server = app.listen(PORT, () => {
      console.log(`
  ┌─────────────────────────────────────────────┐
  │        Task Manager API is running          │
  ├─────────────────────────────────────────────┤
  │  URL     : http://localhost:${PORT}            │
  │  ENV     : ${(process.env.NODE_ENV || 'development').padEnd(10)}                   │
  ├─────────────────────────────────────────────┤
  │  POST    /api/auth/signup                   │
  │  POST    /api/auth/login                    │
  │  POST    /api/auth/logout                   │
  │  GET     /api/auth/google                   │
  │  GET     /api/tasks                         │
  │  POST    /api/tasks                         │
  │  DELETE  /api/tasks/:id                     │
  │  GET     /api/health                        │
  └─────────────────────────────────────────────┘
      `);
    });

    // ── Handle unhandled promise rejections ───────────────────────────────────
    // Shut down the server gracefully then exit
    process.on('unhandledRejection', (err) => {
      console.error('UNHANDLED REJECTION — shutting down...');
      console.error(err.name, err.message);
      server.close(() => process.exit(1));
    });
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });
