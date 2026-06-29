const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Event = require('../models/Event');

exports.getAllEvents = catchAsync(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;
  const schoolFilter = req.user.role === 'super_admin' ? {} : { school: req.user.school?._id || req.user.school };
  const [events, total] = await Promise.all([
    Event.find(schoolFilter).populate('organizer', 'firstName lastName').sort('-startDate').skip(skip).limit(limit),
    Event.countDocuments(schoolFilter),
  ]);
  res.status(200).json({ status: 'success', results: events.length, total, data: events });
});

exports.getEventById = catchAsync(async (req, res, next) => {
  const event = await Event.findById(req.params.id).populate('organizer', 'firstName lastName');
  if (!event) return next(new AppError('Event not found.', 404));
  res.status(200).json({ status: 'success', data: { event } });
});

exports.createEvent = catchAsync(async (req, res) => {
  const schoolId = req.user.school?._id || req.user.school || req.body.school;
  const event = await Event.create({ ...req.body, organizer: req.user._id, school: schoolId });
  res.status(201).json({ status: 'success', data: { event } });
});

exports.updateEvent = catchAsync(async (req, res, next) => {
  const event = await Event.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!event) return next(new AppError('Event not found.', 404));
  res.status(200).json({ status: 'success', data: { event } });
});

exports.deleteEvent = catchAsync(async (req, res, next) => {
  const event = await Event.findByIdAndDelete(req.params.id);
  if (!event) return next(new AppError('Event not found.', 404));
  res.status(204).json({ status: 'success', data: null });
});

exports.getUpcomingEvents = catchAsync(async (req, res) => {
  const schoolFilter = req.user.role === 'super_admin' ? {} : { school: req.user.school?._id || req.user.school };
  const events = await Event.find({ ...schoolFilter, startDate: { $gte: new Date() }, status: 'upcoming' })
    .sort('startDate').limit(10);
  res.status(200).json({ status: 'success', results: events.length, data: events });
});
