const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const platformController = require('../controllers/platformController');

router.get('/schools', protect, restrictTo('super_admin'), platformController.getAllSchools);
router.get('/schools/:id', protect, restrictTo('super_admin'), platformController.getSchoolById);
router.patch('/schools/:id/deactivate', protect, restrictTo('super_admin'), platformController.deactivateSchool);
router.patch('/schools/:id/reactivate', protect, restrictTo('super_admin'), platformController.reactivateSchool);
router.get('/stats', protect, restrictTo('super_admin'), platformController.getPlatformStats);
router.get('/pending-enrollments', protect, restrictTo('super_admin'), platformController.getPendingEnrollments);
router.patch('/users/:id/promote', protect, restrictTo('super_admin'), platformController.promoteUser);

module.exports = router;
