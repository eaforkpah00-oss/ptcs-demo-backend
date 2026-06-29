const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const authController = require('../controllers/authController');

router.post('/login', authController.login);
router.post('/enroll-school', authController.enrollSchool);
router.post('/logout', protect, authController.logout);
router.get('/me', protect, authController.getMe);
router.patch('/update-password', protect, authController.updatePassword);
router.patch('/approve-enrollment/:userId', protect, restrictTo('super_admin'), authController.approveEnrollment);
router.patch('/reject-enrollment/:userId', protect, restrictTo('super_admin'), authController.rejectEnrollment);

module.exports = router;
