const express = require('express');
const router = express.Router();
const progressController = require('../controllers/progressController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/summary', progressController.getSummary);
router.get('/history', progressController.getHistory);

module.exports = router;

