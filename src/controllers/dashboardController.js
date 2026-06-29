const catchAsync = require('../utils/catchAsync');
const User = require('../models/User');
const Student = require('../models/Student');
const Class = require('../models/Class');
const Attendance = require('../models/Attendance');
const Behavior = require('../models/Behavior');
const Academic = require('../models/Academic');
const Announcement = require('../models/Announcement');
const Event = require('../models/Event');
const Message = require('../models/Message');

exports.getAdminDashboard = catchAsync(async (req, res) => {
  const schoolFilter = req.user.role === 'super_admin'
    ? {}
    : { school: req.user.school?._id || req.user.school };
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [userStats, studentCount, classCount, recentBehavior, upcomingEvents, unreadMessages] = await Promise.all([
    User.aggregate([
      { $match: { ...schoolFilter, isActive: true } },
      { $group: { _id: '$role', count: { $sum: 1 } } },
    ]),
    Student.countDocuments({ ...schoolFilter, isActive: true }),
    Class.countDocuments({ ...schoolFilter, isActive: true }),
    Behavior.find(schoolFilter).sort('-createdAt').limit(5).populate('student', 'firstName lastName').populate('teacher', 'firstName lastName'),
    Event.find({ ...schoolFilter, startDate: { $gte: today }, status: 'upcoming' }).sort('startDate').limit(5),
    Message.countDocuments({ recipient: req.user._id, isRead: false, deletedByRecipient: false }),
  ]);

  const roleCounts = {};
  userStats.forEach((s) => { roleCounts[s._id] = s.count; });

  res.status(200).json({
    status: 'success',
    data: {
      totalTeachers: roleCounts.teacher || 0,
      totalParents: roleCounts.parent || 0,
      totalStudents: studentCount,
      totalClasses: classCount,
      recentBehavior,
      upcomingEvents,
      unreadMessages,
    },
  });
});

exports.getTeacherDashboard = catchAsync(async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [myClasses, recentBehavior, recentAcademic] = await Promise.all([
    Class.find({ teacher: req.user._id, isActive: true }).populate('students', 'firstName lastName'),
    Behavior.find({ teacher: req.user._id }).sort('-createdAt').limit(5).populate('student', 'firstName lastName'),
    Academic.find({ teacher: req.user._id }).sort('-createdAt').limit(5).populate('student', 'firstName lastName'),
  ]);

  res.status(200).json({
    status: 'success',
    data: { myClasses, recentBehavior, recentAcademic },
  });
});

exports.getParentDashboard = catchAsync(async (req, res) => {
  const children = await Student.find({ parents: req.user._id, isActive: true })
    .populate('class', 'name').populate('house', 'name');

  const childData = await Promise.all(
    children.map(async (child) => {
      const [recentAttendance, recentBehavior, recentAcademic] = await Promise.all([
        Attendance.find({ student: child._id }).sort('-date').limit(5),
        Behavior.find({ student: child._id }).sort('-date').limit(5),
        Academic.find({ student: child._id }).sort('-date').limit(5),
      ]);
      return { student: child, recentAttendance, recentBehavior, recentAcademic };
    })
  );

  const unreadMessages = await Message.countDocuments({
    recipient: req.user._id, isRead: false, deletedByRecipient: false,
  });

  res.status(200).json({
    status: 'success',
    data: { children: childData, unreadMessages },
  });
});
