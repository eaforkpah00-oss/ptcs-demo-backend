const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const User = require('../models/User');

exports.getAllUsers = catchAsync(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.user.role !== 'super_admin') filter.school = req.user.school._id || req.user.school;
  if (req.query.role) filter.role = req.query.role;
  if (req.query.search) {
    filter.$or = [
      { firstName: { $regex: req.query.search, $options: 'i' } },
      { lastName: { $regex: req.query.search, $options: 'i' } },
      { email: { $regex: req.query.search, $options: 'i' } },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(filter).populate('school', 'name').skip(skip).limit(limit).sort('-createdAt'),
    User.countDocuments(filter),
  ]);
  res.status(200).json({ status: 'success', results: users.length, total, data: users });
});

exports.getUserById = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id).populate('school');
  if (!user) return next(new AppError('User not found.', 404));
  res.status(200).json({ status: 'success', data: { user } });
});

exports.createUser = catchAsync(async (req, res, next) => {
  const schoolId = req.user.role === 'super_admin' ? req.body.school : (req.user.school._id || req.user.school);
  const user = await User.create({ ...req.body, school: schoolId });
  res.status(201).json({ status: 'success', data: { user } });
});

exports.updateUser = catchAsync(async (req, res, next) => {
  const forbidden = ['password', 'passwordChangedAt', 'passwordResetToken', 'passwordResetExpires'];
  forbidden.forEach((f) => delete req.body[f]);
  const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!user) return next(new AppError('User not found.', 404));
  res.status(200).json({ status: 'success', data: { user } });
});

exports.deleteUser = catchAsync(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!user) return next(new AppError('User not found.', 404));
  res.status(200).json({ status: 'success', message: 'User deactivated.' });
});

exports.uploadPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) return next(new AppError('No file uploaded.', 400));
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { profilePhoto: req.file.filename },
    { new: true }
  );
  res.status(200).json({ status: 'success', data: { user } });
});

exports.getUserStats = catchAsync(async (req, res) => {
  const matchStage = { isActive: true };
  if (req.user.role !== 'super_admin') {
    matchStage.school = req.user.school?._id || req.user.school;
  }
  const stats = await User.aggregate([
    { $match: matchStage },
    { $group: { _id: '$role', count: { $sum: 1 } } },
  ]);
  const result = {};
  stats.forEach((s) => { result[s._id] = s.count; });
  res.status(200).json({ status: 'success', data: result });
});
