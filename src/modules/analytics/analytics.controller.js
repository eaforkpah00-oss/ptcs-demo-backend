const catchAsync = require('../../utils/catchAsync');
const ApiResponse = require('../../utils/apiResponse');
const analyticsService = require('./analytics.service');

exports.getSchoolOverview = catchAsync(async (req, res) => {
  const overview = await analyticsService.getSchoolOverview(req.schoolId, req.params.termId);
  return ApiResponse.success(res, overview, 'School overview retrieved.');
});

exports.getAttendanceTrend = catchAsync(async (req, res) => {
  const trend = await analyticsService.getAttendanceTrend(req.schoolId, req.query.classId, req.query.weeks);
  return ApiResponse.success(res, trend, 'Attendance trend retrieved.');
});

exports.getGradeDistribution = catchAsync(async (req, res) => {
  const distribution = await analyticsService.getGradeDistribution(
    req.schoolId, req.query.termId, req.query.classId, req.query.subjectId,
  );
  return ApiResponse.success(res, distribution, 'Grade distribution retrieved.');
});

exports.getFeeCollectionByClass = catchAsync(async (req, res) => {
  const summary = await analyticsService.getFeeCollectionByClass(req.schoolId, req.params.termId);
  return ApiResponse.success(res, summary, 'Fee collection by class retrieved.');
});

exports.getStudentAtRisk = catchAsync(async (req, res) => {
  const students = await analyticsService.getStudentAtRisk(req.schoolId, req.query.termId);
  return ApiResponse.success(res, students, 'At-risk students retrieved.');
});
