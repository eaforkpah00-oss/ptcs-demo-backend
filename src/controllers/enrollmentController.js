const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Enrollment = require('../models/Enrollment');

exports.getAllEnrollments = catchAsync(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  const enrollments = await Enrollment.find(filter).sort('-createdAt');
  res.status(200).json({ status: 'success', results: enrollments.length, data: enrollments });
});

exports.getEnrollment = catchAsync(async (req, res, next) => {
  const enrollment = await Enrollment.findById(req.params.id);
  if (!enrollment) return next(new AppError('Enrollment not found.', 404));
  res.status(200).json({ status: 'success', data: { enrollment } });
});
