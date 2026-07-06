const Event = require('../../models/Event');
const User = require('../../models/User');
const AuditLog = require('../../models/AuditLog');
const AppError = require('../../utils/appError');
const { sendNotification } = require('../../services/notification.service');

async function notifySchoolOfHoliday(schoolId, event) {
  const [parents, teachers] = await Promise.all([
    User.find({ school: schoolId, role: 'parent', isActive: true }),
    User.find({ school: schoolId, role: 'teacher', isActive: true }),
  ]);
  const recipients = [...new Set([...parents, ...teachers].map((u) => String(u._id)))];

  await Promise.all(recipients.map((id) => sendNotification(
    id, 'calendar_holiday', `School Holiday: ${event.title}`,
    `${event.title} from ${event.startDate.toDateString()} to ${event.endDate.toDateString()}. School will be closed.`,
    { schoolId, eventId: event._id },
  )));
}

async function createEvent(schoolId, data, adminId) {
  const startDate = data.startDate;
  const endDate = data.endDate || startDate;

  const event = await Event.create({
    school: schoolId,
    title: data.title,
    description: data.description || null,
    type: data.eventType,
    eventType: data.eventType,
    startDate,
    endDate,
    allDay: data.allDay ?? true,
    affectsClasses: data.affectsClasses || [],
    color: data.color || '#3B82F6',
    organizer: adminId,
    createdBy: adminId,
  });

  if (event.eventType === 'holiday') {
    await notifySchoolOfHoliday(schoolId, event);
  }

  await AuditLog.record({
    school: schoolId, user: adminId, action: 'calendar.event.create',
    targetId: event._id, targetType: 'Event',
  });

  return event;
}

async function getEventsForRange(schoolId, startDate, endDate, classId) {
  const filter = {
    school: schoolId,
    isDeleted: false,
    startDate: { $lte: endDate },
    endDate: { $gte: startDate },
  };
  if (classId) {
    filter.$or = [{ affectsClasses: classId }, { affectsClasses: { $size: 0 } }];
  }

  return Event.find(filter).sort('startDate');
}

async function getUpcomingEvents(schoolId, limit = 5) {
  return Event.find({ school: schoolId, startDate: { $gte: new Date() }, isDeleted: false })
    .sort('startDate')
    .limit(limit);
}

async function updateEvent(schoolId, eventId, data, adminId) {
  const event = await Event.findOne({ _id: eventId, school: schoolId, isDeleted: false });
  if (!event) throw new AppError('Event not found.', 404);

  if (data.eventType) data.type = data.eventType;
  Object.assign(event, data, { updatedBy: adminId });
  await event.save();

  await AuditLog.record({
    school: schoolId, user: adminId, action: 'calendar.event.update',
    targetId: event._id, targetType: 'Event',
  });

  return event;
}

async function deleteEvent(schoolId, eventId, adminId) {
  const event = await Event.findOneAndUpdate(
    { _id: eventId, school: schoolId, isDeleted: false },
    { isDeleted: true, deletedAt: new Date(), updatedBy: adminId },
    { new: true },
  );
  if (!event) throw new AppError('Event not found.', 404);

  await AuditLog.record({
    school: schoolId, user: adminId, action: 'calendar.event.delete',
    targetId: event._id, targetType: 'Event',
  });

  return event;
}

module.exports = {
  createEvent,
  getEventsForRange,
  getUpcomingEvents,
  updateEvent,
  deleteEvent,
};
