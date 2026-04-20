const User = require('../models/User');
const Earning = require('../models/Earning');

exports.getBalance = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({ success: true, balance: user.walletBalance });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.getEarnings = async (req, res) => {
  try {
    const earnings = await Earning.find({ userId: req.user.id }).sort('-date');
    res.status(200).json({ success: true, count: earnings.length, data: earnings });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.withdraw = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (user.walletBalance < req.body.amount) {
      return res.status(400).json({ success: false, message: 'Insufficient balance' });
    }
    user.walletBalance -= req.body.amount;
    await user.save();
    res.status(200).json({ success: true, message: 'Withdrawal successful', newBalance: user.walletBalance });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};