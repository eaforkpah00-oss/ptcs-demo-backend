const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Notification = require('../models/Notification');

exports.getAllNotifications = catchAsync(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;
  const filter = { recipient: req.user._id };
  const [notifications, total] = await Promise.all([
    Notification.find(filter).sort('-createdAt').skip(skip).limit(limit),
    Notification.countDocuments(filter),
  ]);
  res.status(200).json({ status: 'success', results: notifications.length, total, data: notifications });
});

exports.markNotificationRead = catchAsync(async (req, res, next) => {
  const n = await Notification.findByIdAndUpdate(req.params.id, { isRead: true }, { new: true });
  if (!n) return next(new AppError('Notification not found.', 404));
  res.status(200).json({ status: 'success', data: { notification: n } });
});

exports.markAllRead = catchAsync(async (req, res) => {
  await Notification.updateMany({ recipient: req.user._id, isRead: false }, { isRead: true });
  res.status(200).json({ status: 'success', message: 'All notifications marked as read.' });
});

exports.deleteNotification = catchAsync(async (req, res, next) => {
  const n = await Notification.findByIdAndDelete(req.params.id);
  if (!n) return next(new AppError('Notification not found.', 404));
  res.status(204).json({ status: 'success', data: null });
});

exports.getUnreadCount = catchAsync(async (req, res) => {
  const count = await Notification.countDocuments({ recipient: req.user._id, isRead: false });
  res.status(200).json({ status: 'success', data: { count } });
});
