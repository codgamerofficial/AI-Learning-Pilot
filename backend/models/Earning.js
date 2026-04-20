const mongoose = require('mongoose');

const EarningSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  taskId: { type: mongoose.Schema.ObjectId, ref: 'Task', required: true },
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Earning', EarningSchema);