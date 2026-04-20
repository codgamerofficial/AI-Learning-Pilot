const express = require('express');
const { getBalance, getEarnings, withdraw } = require('../controllers/wallet');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/balance', protect, getBalance);
router.get('/earnings', protect, getEarnings);
router.post('/withdraw', protect, withdraw);

module.exports = router;