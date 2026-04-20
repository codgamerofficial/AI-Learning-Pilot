const Task = require('../models/Task');
const Application = require('../models/Application');

exports.getTasks = async (req, res) => {
  try {
    const tasks = await Task.find({ status: 'open' }).populate('postedBy', 'name');
    res.status(200).json({ success: true, count: tasks.length, data: tasks });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.getTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id).populate('postedBy', 'name');
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    res.status(200).json({ success: true, data: task });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.createTask = async (req, res) => {
  try {
    req.body.postedBy = req.user.id;
    const task = await Task.create(req.body);
    res.status(201).json({ success: true, data: task });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.updateTask = async (req, res) => {
  try {
    let task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    if (task.postedBy.toString() !== req.user.id) return res.status(401).json({ success: false, message: 'Not authorized' });
    task = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.status(200).json({ success: true, data: task });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    if (task.postedBy.toString() !== req.user.id) return res.status(401).json({ success: false, message: 'Not authorized' });
    await task.deleteOne();
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.applyForTask = async (req, res) => {
  try {
    const application = await Application.create({ userId: req.user.id, taskId: req.params.id, message: req.body.message });
    res.status(201).json({ success: true, data: application });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.getMyTasks = async (req, res) => {
  try {
    const tasks = await Task.find({ $or: [{ postedBy: req.user.id }, { assignedTo: req.user.id }] });
    res.status(200).json({ success: true, count: tasks.length, data: tasks });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};