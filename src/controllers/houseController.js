const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const House = require('../models/House');
const Student = require('../models/Student');

exports.getAllHouses = catchAsync(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;
  const schoolFilter = req.user.role === 'super_admin' ? {} : { school: req.user.school?._id || req.user.school };
  const [houses, total] = await Promise.all([
    House.find(schoolFilter).populate('housemaster', 'firstName lastName').populate('matron', 'firstName lastName').skip(skip).limit(limit).sort('name'),
    House.countDocuments(schoolFilter),
  ]);
  res.status(200).json({ status: 'success', results: houses.length, total, data: houses });
});

exports.getMyHouses = catchAsync(async (req, res) => {
  const houses = await House.find({ housemaster: req.user._id, isActive: true })
    .populate('matron', 'firstName lastName');
  res.status(200).json({ status: 'success', results: houses.length, data: houses });
});

exports.getHouseById = catchAsync(async (req, res, next) => {
  const house = await House.findById(req.params.id)
    .populate('housemaster', 'firstName lastName email')
    .populate('matron', 'firstName lastName email');
  if (!house) return next(new AppError('House not found.', 404));
  const occupancy = await Student.countDocuments({ house: house._id, isActive: true });
  res.status(200).json({ status: 'success', data: { house: { ...house.toObject(), occupancy } } });
});

exports.createHouse = catchAsync(async (req, res) => {
  const schoolId = req.user.school?._id || req.user.school || req.body.school;
  const house = await House.create({ ...req.body, school: schoolId });
  res.status(201).json({ status: 'success', data: { house } });
});

exports.updateHouse = catchAsync(async (req, res, next) => {
  const house = await House.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!house) return next(new AppError('House not found.', 404));
  res.status(200).json({ status: 'success', data: { house } });
});

exports.deleteHouse = catchAsync(async (req, res, next) => {
  const house = await House.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!house) return next(new AppError('House not found.', 404));
  res.status(200).json({ status: 'success', message: 'House deactivated.' });
});

exports.getHouseStudents = catchAsync(async (req, res) => {
  const students = await Student.find({ house: req.params.id, isActive: true })
    .populate('class', 'name').sort('lastName');
  res.status(200).json({ status: 'success', results: students.length, data: students });
});

exports.addStudentToHouse = catchAsync(async (req, res, next) => {
  const student = await Student.findByIdAndUpdate(
    req.body.studentId,
    { house: req.params.id },
    { new: true }
  );
  if (!student) return next(new AppError('Student not found.', 404));
  res.status(200).json({ status: 'success', data: { student } });
});

exports.removeStudentFromHouse = catchAsync(async (req, res, next) => {
  const student = await Student.findByIdAndUpdate(
    req.params.studentId,
    { $unset: { house: '' } },
    { new: true }
  );
  if (!student) return next(new AppError('Student not found.', 404));
  res.status(200).json({ status: 'success', data: { student } });
});
