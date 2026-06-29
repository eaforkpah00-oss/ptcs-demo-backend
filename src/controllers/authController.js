const jwt = require('jsonwebtoken');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const User = require('../models/User');
const School = require('../models/School');
const Enrollment = require('../models/Enrollment');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });

const sendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  res.cookie('jwt', token, {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  });
  user.password = undefined;
  res.status(statusCode).json({ status: 'success', token, data: { user } });
};

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) return next(new AppError('Please provide email and password.', 400));

  const user = await User.findOne({ email }).select('+password').populate('school');
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password.', 401));
  }
  if (!user.isActive) return next(new AppError('Your account has been deactivated.', 401));

  user.lastLogin = Date.now();
  await user.save({ validateBeforeSave: false });
  sendToken(user, 200, res);
});

exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', { expires: new Date(Date.now() + 10 * 1000), httpOnly: true });
  res.status(200).json({ status: 'success', message: 'Logged out successfully.' });
};

exports.getMe = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id).populate('school');
  res.status(200).json({ status: 'success', data: { user } });
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user.id).select('+password');
  if (!(await user.correctPassword(currentPassword, user.password))) {
    return next(new AppError('Current password is incorrect.', 401));
  }
  user.password = newPassword;
  user.passwordChangedAt = Date.now();
  await user.save();
  sendToken(user, 200, res);
});

exports.enrollSchool = catchAsync(async (req, res, next) => {
  const { schoolName, schoolEmail, adminFirstName, adminLastName, adminEmail } = req.body;
  const existing = await Enrollment.findOne({ adminEmail, status: 'pending' });
  if (existing) return next(new AppError('A pending enrollment request already exists for this email.', 400));

  const enrollment = await Enrollment.create({
    schoolName, schoolEmail, adminFirstName, adminLastName, adminEmail,
  });
  res.status(201).json({
    status: 'success',
    message: 'Enrollment request submitted successfully.',
    data: { enrollment },
  });
});

exports.approveEnrollment = catchAsync(async (req, res, next) => {
  const enrollment = await Enrollment.findById(req.params.userId);
  if (!enrollment) return next(new AppError('Enrollment not found.', 404));
  if (enrollment.status !== 'pending') return next(new AppError('Enrollment is not pending.', 400));

  const school = await School.create({
    name: enrollment.schoolName,
    email: enrollment.schoolEmail,
  });

  const adminUser = await User.create({
    firstName: enrollment.adminFirstName,
    lastName: enrollment.adminLastName,
    email: enrollment.adminEmail,
    password: req.body.password || 'TempPass123!',
    role: 'school_admin',
    school: school._id,
  });

  enrollment.status = 'approved';
  enrollment.school = school._id;
  enrollment.approvedAt = Date.now();
  enrollment.approvedBy = req.user.id;
  await enrollment.save();

  res.status(200).json({ status: 'success', message: 'Enrollment approved.', data: { school, user: adminUser } });
});

exports.rejectEnrollment = catchAsync(async (req, res, next) => {
  const enrollment = await Enrollment.findById(req.params.userId);
  if (!enrollment) return next(new AppError('Enrollment not found.', 404));

  enrollment.status = 'rejected';
  enrollment.rejectionReason = req.body.reason || '';
  await enrollment.save();

  res.status(200).json({ status: 'success', message: 'Enrollment rejected.' });
});
