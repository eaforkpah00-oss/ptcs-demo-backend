const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Attendance = require('../models/Attendance');

exports.markAttendance = catchAsync(async (req, res, next) => {
  const { classId, date, records } = req.body;
  if (!classId || !date || !records || !Array.isArray(records)) {
    return next(new AppError('classId, date, and records array are required.', 400));
  }
  const schoolId = req.user.school?._id || req.user.school;
  const ops = records.map((r) => ({
    updateOne: {
      filter: { student: r.studentId, class: classId, date: new Date(date) },
      update: { $set: { status: r.status, note: r.note, school: schoolId, markedBy: req.user._id } },
      upsert: true,
    },
  }));
  await Attendance.bulkWrite(ops);
  res.status(200).json({ status: 'success', message: 'Attendance marked successfully.' });
});

exports.getAttendanceByClass = catchAsync(async (req, res) => {
  const filter = { class: req.params.classId };
  if (req.query.date) filter.date = new Date(req.query.date);
  const records = await Attendance.find(filter)
    .populate('student', 'firstName lastName studentId')
    .sort('student');
  res.status(200).json({ status: 'success', results: records.length, data: records });
});

exports.getAttendanceByStudent = catchAsync(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 30;
  const skip = (page - 1) * limit;
  const filter = { student: req.params.studentId };
  if (req.query.startDate) filter.date = { $gte: new Date(req.query.startDate) };
  if (req.query.endDate) filter.date = { ...filter.date, $lte: new Date(req.query.endDate) };

  const [records, total] = await Promise.all([
    Attendance.find(filter).populate('class', 'name').sort('-date').skip(skip).limit(limit),
    Attendance.countDocuments(filter),
  ]);
  res.status(200).json({ status: 'success', results: records.length, total, data: records });
});

exports.getAttendanceSummary = catchAsync(async (req, res) => {
  const counts = await Attendance.aggregate([
    { $match: { student: new (require('mongoose').Types.ObjectId)(req.params.studentId) } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  const summary = { present: 0, absent: 0, tardy: 0, excused: 0 };
  counts.forEach((c) => { summary[c._id] = c.count; });
  const total = Object.values(summary).reduce((a, b) => a + b, 0);
  summary.total = total;
  summary.percentage = total > 0 ? Math.round((summary.present / total) * 100) : 0;
  res.status(200).json({ status: 'success', data: summary });
});

exports.getSchoolAttendanceReport = catchAsync(async (req, res) => {
  const schoolId = req.user.school?._id || req.user.school;
  const filter = schoolId ? { school: schoolId } : {};
  if (req.query.startDate) filter.date = { $gte: new Date(req.query.startDate) };
  if (req.query.endDate) filter.date = { ...filter.date, $lte: new Date(req.query.endDate) };

  const report = await Attendance.aggregate([
    { $match: filter },
    { $group: { _id: { class: '$class', status: '$status' }, count: { $sum: 1 } } },
    { $group: { _id: '$_id.class', statuses: { $push: { status: '$_id.status', count: '$count' } } } },
  ]);
  res.status(200).json({ status: 'success', data: report });
});
