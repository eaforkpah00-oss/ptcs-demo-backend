const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Announcement = require('../models/Announcement');

const roleAudienceMap = {
  teacher: ['all', 'teachers'],
  parent: ['all', 'parents'],
  school_admin: ['all', 'teachers', 'parents'],
  super_admin: ['all', 'teachers', 'parents'],
  housemaster: ['all', 'teachers'],
};

exports.getAllAnnouncements = catchAsync(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const audiences = roleAudienceMap[req.user.role] || ['all'];
  const filter = { isPublished: true, targetAudience: { $in: audiences } };
  if (req.user.role !== 'super_admin') {
    filter.school = req.user.school?._id || req.user.school;
  }
  const [announcements, total] = await Promise.all([
    Announcement.find(filter).populate('author', 'firstName lastName').sort('-isPinned -createdAt').skip(skip).limit(limit),
    Announcement.countDocuments(filter),
  ]);
  res.status(200).json({ status: 'success', results: announcements.length, total, data: announcements });
});

exports.getAnnouncementById = catchAsync(async (req, res, next) => {
  const a = await Announcement.findById(req.params.id).populate('author', 'firstName lastName');
  if (!a) return next(new AppError('Announcement not found.', 404));
  res.status(200).json({ status: 'success', data: { announcement: a } });
});

exports.createAnnouncement = catchAsync(async (req, res) => {
  const schoolId = req.user.school?._id || req.user.school || req.body.school;
  const a = await Announcement.create({ ...req.body, author: req.user._id, school: schoolId });
  res.status(201).json({ status: 'success', data: { announcement: a } });
});

exports.updateAnnouncement = catchAsync(async (req, res, next) => {
  const a = await Announcement.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!a) return next(new AppError('Announcement not found.', 404));
  res.status(200).json({ status: 'success', data: { announcement: a } });
});

exports.deleteAnnouncement = catchAsync(async (req, res, next) => {
  const a = await Announcement.findByIdAndDelete(req.params.id);
  if (!a) return next(new AppError('Announcement not found.', 404));
  res.status(204).json({ status: 'success', data: null });
});

exports.pinAnnouncement = catchAsync(async (req, res, next) => {
  const a = await Announcement.findById(req.params.id);
  if (!a) return next(new AppError('Announcement not found.', 404));
  a.isPinned = !a.isPinned;
  await a.save();
  res.status(200).json({ status: 'success', data: { announcement: a } });
});

exports.markAnnouncementRead = catchAsync(async (req, res, next) => {
  const a = await Announcement.findByIdAndUpdate(
    req.params.id,
    { $addToSet: { readBy: req.user._id } },
    { new: true }
  );
  if (!a) return next(new AppError('Announcement not found.', 404));
  res.status(200).json({ status: 'success', data: { announcement: a } });
});
