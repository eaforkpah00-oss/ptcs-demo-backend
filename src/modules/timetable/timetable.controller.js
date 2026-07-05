const catchAsync = require('../../utils/catchAsync');
const ApiResponse = require('../../utils/apiResponse');
const timetableService = require('./timetable.service');

exports.createPeriod = catchAsync(async (req, res) => {
  const period = await timetableService.createPeriod(req.schoolId, req.body, req.user._id);
  return ApiResponse.success(res, period, 'Timetable period created.', 201);
});

exports.updatePeriod = catchAsync(async (req, res) => {
  const period = await timetableService.updatePeriod(req.schoolId, req.params.id, req.body, req.user._id);
  return ApiResponse.success(res, period, 'Timetable period updated.');
});

exports.deletePeriod = catchAsync(async (req, res) => {
  await timetableService.deletePeriod(req.schoolId, req.params.id, req.user._id);
  return ApiResponse.success(res, null, 'Timetable period deleted.');
});

exports.getClassTimetable = catchAsync(async (req, res) => {
  const timetable = await timetableService.getClassTimetable(req.schoolId, req.params.classId, req.query.term);
  return ApiResponse.success(res, timetable, 'Class timetable retrieved.');
});

exports.getTeacherTimetable = catchAsync(async (req, res) => {
  const timetable = await timetableService.getTeacherTimetable(req.schoolId, req.params.teacherId, req.query.term);
  return ApiResponse.success(res, timetable, 'Teacher timetable retrieved.');
});

exports.detectConflicts = catchAsync(async (req, res) => {
  const conflicts = await timetableService.detectConflicts(req.schoolId, req.params.termId);
  return ApiResponse.success(res, conflicts, 'Timetable conflicts retrieved.');
});
