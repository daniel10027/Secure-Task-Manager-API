// ─── utils/catchAsync.js ─────────────────────────────────────────────────────
// A higher-order function that wraps async route handlers.
// Without this wrapper, any error thrown inside an async function would become
// an unhandled promise rejection and Express would never call the error handler.
//
// Usage:
//   router.get('/tasks', catchAsync(async (req, res, next) => {
//     const tasks = await Task.find();
//     res.json(tasks);
//   }));
//
// If Task.find() throws, catchAsync automatically calls next(err),
// which forwards the error to the centralized error-handling middleware.

const catchAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = catchAsync;
