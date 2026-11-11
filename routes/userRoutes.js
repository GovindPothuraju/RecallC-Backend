const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const { validateProfileUpdate, validateChangePassword } = require('../validators/authValidator');

router.use(protect);

router.get('/profile', userController.getProfile);
router.put('/profile', validateProfileUpdate, userController.updateProfile);
router.put('/change-password', validateChangePassword, userController.changePassword);

module.exports = router;

