const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Academic = require('../models/Academic');
const mongoose = require('mongoose');

exports.createAcademic = catchAsync(async (req, res) => {
  const schoolId = req.user.school._id || req.user.school;
  const record = await Academic.create({ ...req.body, teacher: req.user._id, school: schoolId });
  res.status(201).json({ status: 'success', data: { academic: record } });
});

exports.getAllAcademic = catchAsync(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.user.role !== 'super_admin') filter.school = req.user.school._id || req.user.school;
  if (req.query.student) filter.student = req.query.student;
  if (req.query.subject) filter.subject = req.query.subject;

  const [records, total] = await Promise.all([
    Academic.find(filter).populate('student', 'firstName lastName').populate('teacher', 'firstName lastName').sort('-date').skip(skip).limit(limit),
    Academic.countDocuments(filter),
  ]);
  res.status(200).json({ status: 'success', results: records.length, total, data: records });
});

exports.getAcademicById = catchAsync(async (req, res, next) => {
  const record = await Academic.findById(req.params.id)
    .populate('student', 'firstName lastName').populate('teacher', 'firstName lastName');
  if (!record) return next(new AppError('Academic record not found.', 404));
  res.status(200).json({ status: 'success', data: { academic: record } });
});

exports.updateAcademic = catchAsync(async (req, res, next) => {
  const record = await Academic.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!record) return next(new AppError('Academic record not found.', 404));
  res.status(200).json({ status: 'success', data: { academic: record } });
});

exports.deleteAcademic = catchAsync(async (req, res, next) => {
  const record = await Academic.findByIdAndDelete(req.params.id);
  if (!record) return next(new AppError('Academic record not found.', 404));
  res.status(204).json({ status: 'success', data: null });
});

exports.getStudentPerformance = catchAsync(async (req, res) => {
  const studentId = new mongoose.Types.ObjectId(req.params.studentId);
  const performance = await Academic.aggregate([
    { $match: { student: studentId } },
    {
      $group: {
        _id: '$subject',
        averageScore: { $avg: { $multiply: [{ $divide: ['$score', '$maxScore'] }, 100] } },
        count: { $sum: 1 },
        records: { $push: { title: '$title', score: '$score', maxScore: '$maxScore', date: '$date' } },
      },
    },
  ]);
  res.status(200).json({ status: 'success', data: performance });
});
