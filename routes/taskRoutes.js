// ─── routes/taskRoutes.js ─────────────────────────────────────────────────────
const express     = require('express');
const Task        = require('../models/Task');
const AppError    = require('../utils/AppError');
const catchAsync  = require('../utils/catchAsync');
const verifyToken = require('../middleware/verifyToken');

const router = express.Router();

// All task routes require authentication
// verifyToken runs before every handler in this router
router.use(verifyToken);

// ────────────────────────────────────────────────────────────────────────────
// POST /api/tasks — create a new task
// ────────────────────────────────────────────────────────────────────────────
router.post(
  '/',
  catchAsync(async (req, res, next) => {
    const { title, description, completed } = req.body;

    if (!title) {
      return next(new AppError('Task title is required.', 400));
    }

    const task = await Task.create({
      title,
      description,
      completed,
      owner: req.user._id, // set from the verified JWT payload
    });

    res.status(201).json({
      status: 'success',
      data:   { task },
    });
  })
);

// ────────────────────────────────────────────────────────────────────────────
// GET /api/tasks — get all tasks belonging to the logged-in user
// ────────────────────────────────────────────────────────────────────────────
router.get(
  '/',
  catchAsync(async (req, res) => {
    // Filter by owner so users can only see their own tasks
    const tasks = await Task.find({ owner: req.user._id }).sort('-createdAt');

    res.status(200).json({
      status:  'success',
      results: tasks.length,
      data:    { tasks },
    });
  })
);

// ────────────────────────────────────────────────────────────────────────────
// DELETE /api/tasks/:id — delete a task (only the owner can do this)
// ────────────────────────────────────────────────────────────────────────────
router.delete(
  '/:id',
  catchAsync(async (req, res, next) => {
    const task = await Task.findById(req.params.id);

    // 1. Task does not exist
    if (!task) {
      return next(new AppError('No task found with that ID.', 404));
    }

    // 2. Ownership check — compare task owner with the logged-in user
    // .toString() is needed because Mongoose ObjectIds are objects, not strings
    if (task.owner.toString() !== req.user._id.toString()) {
      return next(new AppError('You are not authorized to delete this task.', 403));
    }

    // 3. Delete the task
    await Task.findByIdAndDelete(req.params.id);

    res.status(200).json({
      status:  'success',
      message: 'Task deleted successfully.',
      data:    null,
    });
  })
);

module.exports = router;
