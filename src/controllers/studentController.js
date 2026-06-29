const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Student = require('../models/Student');

exports.getAllStudents = catchAsync(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.user.role !== 'super_admin') filter.school = req.user.school._id || req.user.school;
  if (req.query.class) filter.class = req.query.class;
  if (req.query.house) filter.house = req.query.house;
  if (req.query.search) {
    filter.$or = [
      { firstName: { $regex: req.query.search, $options: 'i' } },
      { lastName: { $regex: req.query.search, $options: 'i' } },
      { studentId: { $regex: req.query.search, $options: 'i' } },
    ];
  }

  const [students, total] = await Promise.all([
    Student.find(filter).populate('class', 'name').populate('parents', 'firstName lastName email').populate('house', 'name').skip(skip).limit(limit).sort('lastName'),
    Student.countDocuments(filter),
  ]);
  res.status(200).json({ status: 'success', results: students.length, total, data: students });
});

exports.getStudentById = catchAsync(async (req, res, next) => {
  const student = await Student.findById(req.params.id)
    .populate('class').populate('parents', '-password').populate('house');
  if (!student) return next(new AppError('Student not found.', 404));
  res.status(200).json({ status: 'success', data: { student } });
});

exports.createStudent = catchAsync(async (req, res) => {
  const schoolId = req.user.school?._id || req.user.school || req.body.school;
  const student = await Student.create({ ...req.body, school: schoolId });
  res.status(201).json({ status: 'success', data: { student } });
});

exports.updateStudent = catchAsync(async (req, res, next) => {
  const student = await Student.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!student) return next(new AppError('Student not found.', 404));
  res.status(200).json({ status: 'success', data: { student } });
});

exports.deleteStudent = catchAsync(async (req, res, next) => {
  const student = await Student.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!student) return next(new AppError('Student not found.', 404));
  res.status(200).json({ status: 'success', message: 'Student deactivated.' });
});

exports.linkParent = catchAsync(async (req, res, next) => {
  const { parentId } = req.body;
  const student = await Student.findByIdAndUpdate(
    req.params.id,
    { $addToSet: { parents: parentId } },
    { new: true }
  );
  if (!student) return next(new AppError('Student not found.', 404));
  res.status(200).json({ status: 'success', data: { student } });
});

exports.getMyChildren = catchAsync(async (req, res) => {
  const students = await Student.find({ parents: req.user._id, isActive: true })
    .populate('class', 'name').populate('house', 'name');
  res.status(200).json({ status: 'success', results: students.length, data: students });
});
