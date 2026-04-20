const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 100 },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  category: { type: String, required: true, enum: ['medical', 'errand', 'transport', 'assistance', 'other'] },
  status: { type: String, enum: ['open', 'assigned', 'in_progress', 'completed', 'cancelled'], default: 'open' },
  postedBy: { type: mongoose.Schema.ObjectId, ref: 'User', required: true },
  assignedTo: { type: mongoose.Schema.ObjectId, ref: 'User' },
  location: { latitude: Number, longitude: Number, address: String },
  deadline: Date,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Task', TaskSchema);