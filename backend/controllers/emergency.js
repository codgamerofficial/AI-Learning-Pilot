const SOSLog = require('../models/SOSLog');
const User = require('../models/User');

exports.sendSOS = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const sosLog = await SOSLog.create({
      userId: req.user.id,
      location: req.body.location,
      contactsNotified: user.emergencyContact ? [{ ...user.emergencyContact, notified: true }] : []
    });
    res.status(201).json({ success: true, data: sosLog, message: 'SOS alert sent' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.getSOSLogs = async (req, res) => {
  try {
    const logs = await SOSLog.find({ userId: req.user.id }).sort('-timestamp');
    res.status(200).json({ success: true, count: logs.length, data: logs });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.resolveSOS = async (req, res) => {
  try {
    const log = await SOSLog.findByIdAndUpdate(req.params.id, { status: 'resolved' }, { new: true });
    res.status(200).json({ success: true, data: log });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};