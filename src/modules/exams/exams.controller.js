const catchAsync = require('../../utils/catchAsync');
const ApiResponse = require('../../utils/apiResponse');
const examsService = require('./exams.service');

exports.scheduleExam = catchAsync(async (req, res) => {
  const result = await examsService.scheduleExam(req.schoolId, req.body, req.user._id);
  return ApiResponse.success(res, result, 'Exam scheduled.', 201);
});

exports.getExamSchedule = catchAsync(async (req, res) => {
  const schedule = await examsService.getExamSchedule(req.schoolId, req.params.termId, req.query.class);
  return ApiResponse.success(res, schedule, 'Exam schedule retrieved.');
});

exports.submitExamResults = catchAsync(async (req, res) => {
  const result = await examsService.submitExamResults(req.schoolId, req.params.examId, req.body.grades, req.user._id);
  return ApiResponse.success(res, result, 'Exam results submitted.', 201);
});

exports.getExamResults = catchAsync(async (req, res) => {
  const results = await examsService.getExamResults(req.schoolId, req.params.examId);
  return ApiResponse.success(res, results, 'Exam results retrieved.');
});

exports.updateExam = catchAsync(async (req, res) => {
  const result = await examsService.updateExam(req.schoolId, req.params.examId, req.body, req.user._id);
  return ApiResponse.success(res, result, 'Exam updated.');
});

exports.cancelExam = catchAsync(async (req, res) => {
  const exam = await examsService.cancelExam(req.schoolId, req.params.examId, req.user._id);
  return ApiResponse.success(res, exam, 'Exam cancelled.');
});
