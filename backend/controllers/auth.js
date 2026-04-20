const User = require('../models/User');

exports.register = async (req, res) => {
  try {
    const { name, email, password, phone, emergencyContact } = req.body;
    const user = await User.create({ name, email, password, phone, emergencyContact });
    const token = user.getSignedJwtToken();
    res.status(201).json({ success: true, token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    const token = user.getSignedJwtToken();
    res.status(200).json({ success: true, token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.getMe = async (req, res) => {
  const user = await User.findById(req.user.id);
  res.status(200).json({ success: true, user });
};