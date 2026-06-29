const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Class = require('../models/Class');

exports.getAllClasses = catchAsync(async (req, res) => {
  const filter = {};
  if (req.user.role !== 'super_admin') filter.school = req.user.school._id || req.user.school;
  const classes = await Class.find(filter).populate('teacher', 'firstName lastName email').sort('name');
  res.status(200).json({ status: 'success', results: classes.length, data: classes });
});

exports.getClassById = catchAsync(async (req, res, next) => {
  const cls = await Class.findById(req.params.id)
    .populate('teacher', 'firstName lastName email')
    .populate('students', 'firstName lastName studentId');
  if (!cls) return next(new AppError('Class not found.', 404));
  res.status(200).json({ status: 'success', data: { class: cls } });
});

exports.createClass = catchAsync(async (req, res) => {
  const schoolId = req.user.school?._id || req.user.school || req.body.school;
  const cls = await Class.create({ ...req.body, school: schoolId });
  res.status(201).json({ status: 'success', data: { class: cls } });
});

exports.updateClass = catchAsync(async (req, res, next) => {
  const cls = await Class.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!cls) return next(new AppError('Class not found.', 404));
  res.status(200).json({ status: 'success', data: { class: cls } });
});

exports.deleteClass = catchAsync(async (req, res, next) => {
  const cls = await Class.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!cls) return next(new AppError('Class not found.', 404));
  res.status(200).json({ status: 'success', message: 'Class deactivated.' });
});

exports.getMyClasses = catchAsync(async (req, res) => {
  const classes = await Class.find({ teacher: req.user._id, isActive: true })
    .populate('students', 'firstName lastName');
  res.status(200).json({ status: 'success', results: classes.length, data: classes });
});

exports.assignTeacher = catchAsync(async (req, res, next) => {
  const cls = await Class.findByIdAndUpdate(
    req.params.id,
    { teacher: req.body.teacherId },
    { new: true }
  ).populate('teacher', 'firstName lastName');
  if (!cls) return next(new AppError('Class not found.', 404));
  res.status(200).json({ status: 'success', data: { class: cls } });
});
