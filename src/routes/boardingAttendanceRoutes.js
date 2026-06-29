const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const boardingAttendanceController = require('../controllers/boardingAttendanceController');

router.post('/', protect, restrictTo('housemaster', 'school_admin'), boardingAttendanceController.markBoardingAttendance);
router.get('/house', protect, boardingAttendanceController.getBoardingAttendanceByHouse);
router.get('/student/:studentId', protect, boardingAttendanceController.getBoardingAttendanceByStudent);
router.get('/summary/:houseId', protect, boardingAttendanceController.getHouseBoardingAttendanceSummary);
router.get('/school-summary', protect, restrictTo('school_admin', 'super_admin'), boardingAttendanceController.getSchoolBoardingAttendanceSummary);

module.exports = router;
