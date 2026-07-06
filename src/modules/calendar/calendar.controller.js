const catchAsync = require('../../utils/catchAsync');
const ApiResponse = require('../../utils/apiResponse');
const calendarService = require('./calendar.service');

exports.createEvent = catchAsync(async (req, res) => {
  const event = await calendarService.createEvent(req.schoolId, req.body, req.user._id);
  return ApiResponse.success(res, event, 'Event created.', 201);
});

exports.getEvents = catchAsync(async (req, res) => {
  const { startDate, endDate, classId } = req.query;
  const events = await calendarService.getEventsForRange(req.schoolId, startDate, endDate, classId);
  return ApiResponse.success(res, events, 'Events retrieved.');
});

exports.getUpcomingEvents = catchAsync(async (req, res) => {
  const events = await calendarService.getUpcomingEvents(req.schoolId, Number(req.query.limit) || 5);
  return ApiResponse.success(res, events, 'Upcoming events retrieved.');
});

exports.updateEvent = catchAsync(async (req, res) => {
  const event = await calendarService.updateEvent(req.schoolId, req.params.id, req.body, req.user._id);
  return ApiResponse.success(res, event, 'Event updated.');
});

exports.deleteEvent = catchAsync(async (req, res) => {
  const event = await calendarService.deleteEvent(req.schoolId, req.params.id, req.user._id);
  return ApiResponse.success(res, event, 'Event deleted.');
});
