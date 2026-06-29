const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const BoardingAttendance = require('../models/BoardingAttendance');
const mongoose = require('mongoose');

exports.markBoardingAttendance = catchAsync(async (req, res, next) => {
  const { houseId, date, period, records } = req.body;
  if (!houseId || !date || !period || !records || !Array.isArray(records)) {
    return next(new AppError('houseId, date, period, and records array are required.', 400));
  }
  const schoolId = req.user.school?._id || req.user.school;
  const ops = records.map((r) => ({
    updateOne: {
      filter: { student: r.studentId, house: houseId, date: new Date(date), period },
      update: { $set: { status: r.status, note: r.note, school: schoolId, markedBy: req.user._id } },
      upsert: true,
    },
  }));
  await BoardingAttendance.bulkWrite(ops);
  res.status(200).json({ status: 'success', message: 'Boarding attendance marked.' });
});

exports.getBoardingAttendanceByHouse = catchAsync(async (req, res) => {
  const filter = {};
  if (req.query.houseId) filter.house = req.query.houseId;
  if (req.query.date) filter.date = new Date(req.query.date);
  if (req.query.period) filter.period = req.query.period;

  const records = await BoardingAttendance.find(filter)
    .populate('student', 'firstName lastName').sort('student');
  res.status(200).json({ status: 'success', results: records.length, data: records });
});

exports.getBoardingAttendanceByStudent = catchAsync(async (req, res) => {
  const records = await BoardingAttendance.find({ student: req.params.studentId })
    .populate('house', 'name').sort('-date');
  res.status(200).json({ status: 'success', results: records.length, data: records });
});

exports.getHouseBoardingAttendanceSummary = catchAsync(async (req, res) => {
  const summary = await BoardingAttendance.aggregate([
    { $match: { house: new mongoose.Types.ObjectId(req.params.houseId) } },
    { $group: { _id: { period: '$period', status: '$status' }, count: { $sum: 1 } } },
  ]);
  res.status(200).json({ status: 'success', data: summary });
});

exports.getSchoolBoardingAttendanceSummary = catchAsync(async (req, res) => {
  const schoolId = req.user.school?._id || req.user.school;
  const filter = schoolId ? { school: schoolId } : {};
  if (req.query.startDate) filter.date = { $gte: new Date(req.query.startDate) };
  if (req.query.endDate) filter.date = { ...filter.date, $lte: new Date(req.query.endDate) };

  const summary = await BoardingAttendance.aggregate([
    { $match: filter },
    { $group: { _id: { house: '$house', status: '$status' }, count: { $sum: 1 } } },
  ]);
  res.status(200).json({ status: 'success', data: summary });
});
