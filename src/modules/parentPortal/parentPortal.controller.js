const catchAsync = require('../../utils/catchAsync');
const ApiResponse = require('../../utils/apiResponse');
const parentPortalService = require('./parentPortal.service');
const timetableService = require('../timetable/timetable.service');
const calendarService = require('../calendar/calendar.service');

exports.getChildDashboard = catchAsync(async (req, res) => {
  const dashboard = await parentPortalService.getChildDashboard(req.user._id, req.schoolId);
  return ApiResponse.success(res, dashboard, 'Child dashboard retrieved.');
});

exports.getChildFullReport = catchAsync(async (req, res) => {
  const report = await parentPortalService.getChildFullReport(
    req.user._id, req.params.studentId, req.params.termId, req.schoolId,
  );
  return ApiResponse.success(res, report, 'Child report retrieved.');
});

exports.getChildAttendance = catchAsync(async (req, res) => {
  const { startDate, endDate, page, limit } = req.query;
  const attendance = await parentPortalService.getChildAttendance(req.user._id, req.params.studentId, req.schoolId, {
    startDate, endDate, page: Number(page) || 1, limit: Number(limit) || 30,
  });
  return ApiResponse.success(res, attendance, 'Child attendance retrieved.');
});

exports.getChildFeeStatement = catchAsync(async (req, res) => {
  const statement = await parentPortalService.getChildFeeStatement(
    req.user._id, req.params.studentId, req.query.term, req.schoolId,
  );
  return ApiResponse.success(res, statement, 'Child fee statement retrieved.');
});

exports.initiateChildFeePayment = catchAsync(async (req, res) => {
  const payment = await parentPortalService.initiateChildFeePayment(req.user._id, req.params.invoiceId, req.schoolId);
  return ApiResponse.success(res, payment, 'Payment initiated.', 201);
});

exports.getClassTimetable = catchAsync(async (req, res) => {
  const timetable = await timetableService.getClassTimetable(req.schoolId, req.params.classId, req.query.term);
  return ApiResponse.success(res, timetable, 'Class timetable retrieved.');
});

exports.getCalendar = catchAsync(async (req, res) => {
  const events = await calendarService.getEventsForRange(
    req.schoolId, req.query.startDate, req.query.endDate, req.query.classId,
  );
  return ApiResponse.success(res, events, 'Calendar events retrieved.');
});

exports.getChildBorrowHistory = catchAsync(async (req, res) => {
  const history = await parentPortalService.getChildBorrowHistory(req.user._id, req.params.studentId, req.schoolId);
  return ApiResponse.success(res, history, 'Borrow history retrieved.');
});

exports.updateOwnProfile = catchAsync(async (req, res) => {
  const user = await parentPortalService.updateOwnProfile(req.user._id, req.schoolId, req.body);
  return ApiResponse.success(res, user, 'Profile updated.');
});
