const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const upload = require('../middleware/upload');
const schoolController = require('../controllers/schoolController');

router.get('/me', protect, schoolController.getMySchool);
router.patch('/me', protect, restrictTo('school_admin'), schoolController.updateMySchool);
router.patch('/me/logo', protect, restrictTo('school_admin'), upload.single('logo'), schoolController.updateLogo);
router.get('/me/stats', protect, restrictTo('school_admin', 'super_admin'), schoolController.getMySchoolStats);

module.exports = router;
