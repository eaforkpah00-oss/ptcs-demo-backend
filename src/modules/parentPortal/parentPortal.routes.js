const express = require('express');
const { protect, restrictTo } = require('../../middleware/auth');
const { attachTenant } = require('../../middleware/tenant');
const { validate, validateQuery } = require('../../middleware/validate');
const parentPortalValidation = require('./parentPortal.validation');
const calendarValidation = require('../calendar/calendar.validation');
const parentPortalController = require('./parentPortal.controller');

const router = express.Router();

router.use(protect, attachTenant, restrictTo('parent'));

router.get('/dashboard', parentPortalController.getChildDashboard);
router.get('/child/:studentId/report/:termId', parentPortalController.getChildFullReport);
router.get('/child/:studentId/attendance', parentPortalController.getChildAttendance);
router.get('/child/:studentId/fees', parentPortalController.getChildFeeStatement);
router.post('/fees/pay/:invoiceId', parentPortalController.initiateChildFeePayment);
router.get('/timetable/:classId', parentPortalController.getClassTimetable);
router.get('/calendar', validateQuery(calendarValidation.getEvents), parentPortalController.getCalendar);
router.get('/child/:studentId/books', parentPortalController.getChildBorrowHistory);
router.patch('/profile', validate(parentPortalValidation.updateProfile), parentPortalController.updateOwnProfile);

module.exports = router;
