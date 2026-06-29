const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const attendanceController = require('../controllers/attendanceController');

router.post('/mark', protect, restrictTo('teacher', 'school_admin'), attendanceController.markAttendance);
router.get('/class/:classId', protect, attendanceController.getAttendanceByClass);
router.get('/student/:studentId', protect, attendanceController.getAttendanceByStudent);
router.get('/summary/:studentId', protect, attendanceController.getAttendanceSummary);
router.get('/reports/school', protect, restrictTo('school_admin', 'super_admin'), attendanceController.getSchoolAttendanceReport);

module.exports = router;
