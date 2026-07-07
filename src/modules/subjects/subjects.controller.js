const catchAsync = require('../../utils/catchAsync');
const ApiResponse = require('../../utils/apiResponse');
const subjectsService = require('./subjects.service');

exports.getSubjects = catchAsync(async (req, res) => {
  const subjects = await subjectsService.getSubjects(req.schoolId);
  return ApiResponse.success(res, subjects, 'Subjects retrieved.');
});

exports.createSubject = catchAsync(async (req, res) => {
  const subject = await subjectsService.createSubject(req.schoolId, req.body, req.user._id);
  return ApiResponse.success(res, subject, 'Subject created.', 201);
});
