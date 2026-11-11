const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const topicRoutes = require('./topicRoutes');
const revisionRoutes = require('./revisionRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const progressRoutes = require('./progressRoutes');
const userRoutes = require('./userRoutes');

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'RecallC API is healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

router.use('/auth', authRoutes);
router.use('/topics', topicRoutes);
router.use('/revisions', revisionRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/progress', progressRoutes);
router.use('/users', userRoutes);

module.exports = router;

