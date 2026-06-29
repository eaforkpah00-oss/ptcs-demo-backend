const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const School = require('../models/School');
const User = require('../models/User');
const Student = require('../models/Student');
const Enrollment = require('../models/Enrollment');
const Class = require('../models/Class');

exports.getAllSchools = catchAsync(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;
  const [schools, total] = await Promise.all([
    School.find().sort('-createdAt').skip(skip).limit(limit),
    School.countDocuments(),
  ]);
  res.status(200).json({ status: 'success', results: schools.length, total, data: schools });
});

exports.getSchoolById = catchAsync(async (req, res, next) => {
  const school = await School.findById(req.params.id);
  if (!school) return next(new AppError('School not found.', 404));
  const [userCount, studentCount] = await Promise.all([
    User.countDocuments({ school: school._id }),
    Student.countDocuments({ school: school._id }),
  ]);
  res.status(200).json({ status: 'success', data: { school, userCount, studentCount } });
});

exports.deactivateSchool = catchAsync(async (req, res, next) => {
  const school = await School.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!school) return next(new AppError('School not found.', 404));
  res.status(200).json({ status: 'success', data: { school } });
});

exports.reactivateSchool = catchAsync(async (req, res, next) => {
  const school = await School.findByIdAndUpdate(req.params.id, { isActive: true }, { new: true });
  if (!school) return next(new AppError('School not found.', 404));
  res.status(200).json({ status: 'success', data: { school } });
});

exports.getPlatformStats = catchAsync(async (req, res) => {
  const [
    totalSchools,
    activeSchools,
    totalUsers,
    totalStudents,
    superAdminCount,
    schoolAdminCount,
    teacherCount,
    parentCount,
    totalClasses,
    recentSchools,
  ] = await Promise.all([
    School.countDocuments(),
    School.countDocuments({ isActive: true }),
    User.countDocuments(),
    Student.countDocuments(),
    User.countDocuments({ role: 'super_admin' }),
    User.countDocuments({ role: 'school_admin' }),
    User.countDocuments({ role: 'teacher' }),
    User.countDocuments({ role: 'parent' }),
    require('../models/Class').countDocuments(),
    School.find().sort('-createdAt').limit(10).select('_id name email type isActive createdAt'),
  ]);

  const stats = {
    totalSchools,
    activeSchools,
    totalUsers,
    totalStudents,
    totalClasses,
    byRole: {
      super_admin: superAdminCount,
      school_admin: schoolAdminCount,
      teacher: teacherCount,
      parent: parentCount,
    },
    recentEnrollments: recentSchools.map((s) => ({
      _id: s._id,
      name: s.name,
      email: s.email,
      type: s.type,
      isActive: s.isActive,
      createdAt: s.createdAt,
    })),
  };

  res.status(200).json({ status: 'success', data: { stats } });
});

exports.getPendingEnrollments = catchAsync(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;
  const [enrollments, total] = await Promise.all([
    Enrollment.find({ status: 'pending' }).sort('-createdAt').skip(skip).limit(limit),
    Enrollment.countDocuments({ status: 'pending' }),
  ]);
  res.status(200).json({ status: 'success', results: enrollments.length, total, data: enrollments });
});

exports.promoteUser = catchAsync(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(req.params.id, { role: 'school_admin' }, { new: true });
  if (!user) return next(new AppError('User not found.', 404));
  res.status(200).json({ status: 'success', data: { user } });
});
