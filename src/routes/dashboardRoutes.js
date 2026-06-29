const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const dashboardController = require('../controllers/dashboardController');

router.get('/admin', protect, restrictTo('school_admin', 'super_admin'), dashboardController.getAdminDashboard);
router.get('/teacher', protect, restrictTo('teacher'), dashboardController.getTeacherDashboard);
router.get('/parent', protect, restrictTo('parent'), dashboardController.getParentDashboard);

module.exports = router;
