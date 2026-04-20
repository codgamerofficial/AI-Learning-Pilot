const express = require('express');
const { getTasks, getTask, createTask, updateTask, deleteTask, applyForTask, getMyTasks } = require('../controllers/tasks');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.route('/').get(getTasks).post(protect, createTask);
router.route('/me').get(protect, getMyTasks);
router.route('/:id').get(getTask).put(protect, updateTask).delete(protect, deleteTask);
router.post('/:id/apply', protect, applyForTask);

module.exports = router;