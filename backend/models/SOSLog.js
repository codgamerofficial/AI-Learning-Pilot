const mongoose = require('mongoose');

const SOSLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.ObjectId, ref: 'User', required: true },
  timestamp: { type: Date, default: Date.now },
  location: { latitude: Number, longitude: Number, address: String },
  contactsNotified: [{
    name: String,
    phone: String,
    notified: { type: Boolean, default: false }
  }],
  status: { type: String, enum: ['active', 'resolved', 'cancelled'], default: 'active' }
});

module.exports = mongoose.model('SOSLog', SOSLogSchema);