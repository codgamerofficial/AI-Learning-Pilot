const express = require('express');
const { sendSOS, getSOSLogs, resolveSOS } = require('../controllers/emergency');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/sos', protect, sendSOS);
router.get('/logs', protect, getSOSLogs);
router.put('/sos/:id/resolve', protect, resolveSOS);

module.exports = router;