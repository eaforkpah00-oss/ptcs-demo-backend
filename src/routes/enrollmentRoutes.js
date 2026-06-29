const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const enrollmentController = require('../controllers/enrollmentController');

router.get('/', protect, restrictTo('super_admin'), enrollmentController.getAllEnrollments);
router.get('/:id', protect, restrictTo('super_admin'), enrollmentController.getEnrollment);

module.exports = router;
