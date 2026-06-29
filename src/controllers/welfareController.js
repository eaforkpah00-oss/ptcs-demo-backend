const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Welfare = require('../models/Welfare');

exports.createWelfare = catchAsync(async (req, res) => {
  const schoolId = req.user.school?._id || req.user.school || req.body.school;
  const record = await Welfare.create({ ...req.body, housemaster: req.user._id, school: schoolId });
  res.status(201).json({ status: 'success', data: { welfare: record } });
});

exports.getAllWelfare = catchAsync(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;
  const schoolId = req.user.school?._id || req.user.school;
  const filter = schoolId ? { school: schoolId } : {};
  if (req.query.house) filter.house = req.query.house;
  if (req.query.student) filter.student = req.query.student;
  if (req.query.category) filter.category = req.query.category;

  const [records, total] = await Promise.all([
    Welfare.find(filter).populate('student', 'firstName lastName').populate('housemaster', 'firstName lastName').sort('-date').skip(skip).limit(limit),
    Welfare.countDocuments(filter),
  ]);
  res.status(200).json({ status: 'success', results: records.length, total, data: records });
});

exports.getWelfareById = catchAsync(async (req, res, next) => {
  const record = await Welfare.findById(req.params.id)
    .populate('student', 'firstName lastName').populate('housemaster', 'firstName lastName').populate('house', 'name');
  if (!record) return next(new AppError('Welfare record not found.', 404));
  res.status(200).json({ status: 'success', data: { welfare: record } });
});

exports.updateWelfare = catchAsync(async (req, res, next) => {
  const record = await Welfare.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!record) return next(new AppError('Welfare record not found.', 404));
  res.status(200).json({ status: 'success', data: { welfare: record } });
});

exports.deleteWelfare = catchAsync(async (req, res, next) => {
  const record = await Welfare.findByIdAndDelete(req.params.id);
  if (!record) return next(new AppError('Welfare record not found.', 404));
  res.status(204).json({ status: 'success', data: null });
});

exports.getStudentWelfareHistory = catchAsync(async (req, res) => {
  const records = await Welfare.find({ student: req.params.studentId })
    .populate('housemaster', 'firstName lastName').populate('house', 'name').sort('-date');
  res.status(200).json({ status: 'success', results: records.length, data: records });
});

exports.getHouseWelfareSummary = catchAsync(async (req, res) => {
  const summary = await Welfare.aggregate([
    { $match: { house: new (require('mongoose').Types.ObjectId)(req.params.houseId) } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
  ]);
  res.status(200).json({ status: 'success', data: summary });
});
