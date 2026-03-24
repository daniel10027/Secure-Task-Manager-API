// ─── models/Task.js ───────────────────────────────────────────────────────────
const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    title: {
      type:     String,
      required: [true, 'Task title is required'],
      trim:     true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    description: {
      type:     String,
      trim:     true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    completed: {
      type:    Boolean,
      default: false,
    },
    // owner references the User who created the task
    // This is how we enforce ownership: only the owner can read/delete the task
    owner: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: [true, 'A task must belong to a user'],
    },
  },
  {
    timestamps: true,
  }
);

// ── Index: speeds up queries for "all tasks by this user" ─────────────────────
taskSchema.index({ owner: 1 });

const Task = mongoose.model('Task', taskSchema);
module.exports = Task;
