const mongoose = require('mongoose');

const ApplicationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.ObjectId, ref: 'User', required: true },
  taskId: { type: mongoose.Schema.ObjectId, ref: 'Task', required: true },
  status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  message: { type: String, maxlength: 500 },
  createdAt: { type: Date, default: Date.now }
});

ApplicationSchema.index({ userId: 1, taskId: 1 }, { unique: true });

module.exports = mongoose.model('Application', ApplicationSchema);