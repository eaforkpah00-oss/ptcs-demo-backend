const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const School = require('../models/School');
const User = require('../models/User');
const Student = require('../models/Student');
const Class = require('../models/Class');

exports.getMySchool = catchAsync(async (req, res, next) => {
  const schoolId = req.user.school?._id || req.user.school;
  if (!schoolId) return next(new AppError('No school associated with this account.', 404));
  const school = await School.findById(schoolId);
  if (!school) return next(new AppError('School not found.', 404));
  res.status(200).json({ status: 'success', data: { school } });
});

exports.updateMySchool = catchAsync(async (req, res, next) => {
  const schoolId = req.user.school?._id || req.user.school;
  delete req.body.enrollmentCode;
  const school = await School.findByIdAndUpdate(schoolId, req.body, { new: true, runValidators: true });
  res.status(200).json({ status: 'success', data: { school } });
});

exports.updateLogo = catchAsync(async (req, res, next) => {
  if (!req.file) return next(new AppError('No file uploaded.', 400));
  const schoolId = req.user.school?._id || req.user.school;
  const school = await School.findByIdAndUpdate(schoolId, { logo: req.file.filename }, { new: true });
  res.status(200).json({ status: 'success', data: { school } });
});

exports.getMySchoolStats = catchAsync(async (req, res) => {
  const schoolFilter = req.user.role === 'super_admin'
    ? {}
    : { school: req.user.school?._id || req.user.school };
  const [userCount, studentCount, classCount] = await Promise.all([
    User.countDocuments({ ...schoolFilter, isActive: true }),
    Student.countDocuments({ ...schoolFilter, isActive: true }),
    Class.countDocuments({ ...schoolFilter, isActive: true }),
  ]);
  res.status(200).json({ status: 'success', data: { userCount, studentCount, classCount } });
});
