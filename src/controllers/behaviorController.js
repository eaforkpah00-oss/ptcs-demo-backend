const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Behavior = require('../models/Behavior');

exports.createBehavior = catchAsync(async (req, res) => {
  const schoolId = req.user.school._id || req.user.school;
  const record = await Behavior.create({ ...req.body, teacher: req.user._id, school: schoolId });
  res.status(201).json({ status: 'success', data: { behavior: record } });
});

exports.getAllBehavior = catchAsync(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.user.role !== 'super_admin') filter.school = req.user.school._id || req.user.school;
  if (req.query.student) filter.student = req.query.student;
  if (req.query.type) filter.type = req.query.type;
  if (req.query.startDate) filter.date = { $gte: new Date(req.query.startDate) };
  if (req.query.endDate) filter.date = { ...filter.date, $lte: new Date(req.query.endDate) };

  const [records, total] = await Promise.all([
    Behavior.find(filter).populate('student', 'firstName lastName').populate('teacher', 'firstName lastName').sort('-date').skip(skip).limit(limit),
    Behavior.countDocuments(filter),
  ]);
  res.status(200).json({ status: 'success', results: records.length, total, data: records });
});

exports.getBehaviorById = catchAsync(async (req, res, next) => {
  const record = await Behavior.findById(req.params.id)
    .populate('student', 'firstName lastName').populate('teacher', 'firstName lastName');
  if (!record) return next(new AppError('Behavior record not found.', 404));
  res.status(200).json({ status: 'success', data: { behavior: record } });
});

exports.updateBehavior = catchAsync(async (req, res, next) => {
  const record = await Behavior.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!record) return next(new AppError('Behavior record not found.', 404));
  res.status(200).json({ status: 'success', data: { behavior: record } });
});

exports.deleteBehavior = catchAsync(async (req, res, next) => {
  const record = await Behavior.findByIdAndDelete(req.params.id);
  if (!record) return next(new AppError('Behavior record not found.', 404));
  res.status(204).json({ status: 'success', data: null });
});

exports.getStudentBehaviorHistory = catchAsync(async (req, res) => {
  const records = await Behavior.find({ student: req.params.studentId })
    .populate('teacher', 'firstName lastName').sort('-date');
  res.status(200).json({ status: 'success', results: records.length, data: records });
});
