const School = require('../src/models/School');
const Class = require('../src/models/Class');
const User = require('../src/models/User');
const Event = require('../src/models/Event');
const AuditLog = require('../src/models/AuditLog');
const Notification = require('../src/models/Notification');
const calendarService = require('../src/modules/calendar/calendar.service');

describe('Calendar service', () => {
  async function makeFixture() {
    const school = await School.create({ name: 'Calendar Demo School', email: `cal${Date.now()}@test.com` });
    const teacher = await User.create({
      firstName: 'Kwame', lastName: 'Teacher', email: `teacher${Date.now()}@test.com`,
      password: 'password123', role: 'teacher', school: school._id,
    });
    const parent = await User.create({
      firstName: 'Parent', lastName: 'One', email: `parent${Date.now()}@test.com`,
      password: 'password123', role: 'parent', school: school._id,
    });
    const klass = await Class.create({ name: 'Class 1', school: school._id });
    const admin = await User.create({
      firstName: 'Admin', lastName: 'User', email: `admin${Date.now()}@test.com`,
      password: 'password123', role: 'school_admin', school: school._id,
    });
    return {
      school, teacher, parent, klass, admin,
    };
  }

  test('createEvent with eventType holiday notifies every parent and teacher', async () => {
    const {
      school, teacher, parent, admin,
    } = await makeFixture();

    const event = await calendarService.createEvent(school._id, {
      title: 'Independence Day', eventType: 'holiday', startDate: new Date('2026-03-06'),
    }, admin._id);

    expect(event.endDate.toDateString()).toBe(event.startDate.toDateString());
    expect(event.type).toBe('holiday');

    const notifications = await Notification.find({ type: 'calendar_holiday' });
    const recipientIds = notifications.map((n) => String(n.recipient));
    expect(recipientIds).toContain(String(teacher._id));
    expect(recipientIds).toContain(String(parent._id));

    const auditEntries = await AuditLog.find({ school: school._id, action: 'calendar.event.create' });
    expect(auditEntries).toHaveLength(1);
  });

  test('createEvent with a non-holiday eventType does not send a holiday notification', async () => {
    const { school, admin } = await makeFixture();

    await calendarService.createEvent(school._id, {
      title: 'Staff Meeting', eventType: 'meeting', startDate: new Date('2026-03-10'),
    }, admin._id);

    const notifications = await Notification.find({ type: 'calendar_holiday' });
    expect(notifications).toHaveLength(0);
  });

  test('getEventsForRange returns events overlapping the given range, sorted by startDate', async () => {
    const { school, klass, admin } = await makeFixture();
    await calendarService.createEvent(school._id, {
      title: 'Mid-Term Exams', eventType: 'exam', startDate: new Date('2026-04-10'), endDate: new Date('2026-04-12'),
    }, admin._id);
    await calendarService.createEvent(school._id, {
      title: 'Sports Day', eventType: 'sports', startDate: new Date('2026-04-01'),
    }, admin._id);
    await calendarService.createEvent(school._id, {
      title: 'Next Term Meeting', eventType: 'meeting', startDate: new Date('2026-05-01'),
    }, admin._id);

    const events = await calendarService.getEventsForRange(
      school._id, new Date('2026-04-01'), new Date('2026-04-30'),
    );

    expect(events.map((e) => e.title)).toEqual(['Sports Day', 'Mid-Term Exams']);

    const classScoped = await calendarService.getEventsForRange(
      school._id, new Date('2026-04-01'), new Date('2026-04-30'), klass._id,
    );
    expect(classScoped.map((e) => e.title)).toEqual(['Sports Day', 'Mid-Term Exams']);
  });

  test('deleteEvent soft-deletes so it no longer appears in range queries', async () => {
    const { school, admin } = await makeFixture();
    const event = await calendarService.createEvent(school._id, {
      title: 'Cultural Day', eventType: 'cultural', startDate: new Date('2026-06-01'),
    }, admin._id);

    const deleted = await calendarService.deleteEvent(school._id, event._id, admin._id);
    expect(deleted.isDeleted).toBe(true);

    const events = await calendarService.getEventsForRange(
      school._id, new Date('2026-05-01'), new Date('2026-06-30'),
    );
    expect(events).toHaveLength(0);

    const stillInDb = await Event.findById(event._id);
    expect(stillInDb).not.toBeNull();
  });

  test('updateEvent keeps the legacy type field in sync with eventType', async () => {
    const { school, admin } = await makeFixture();
    const event = await calendarService.createEvent(school._id, {
      title: 'Founders Day', eventType: 'other', startDate: new Date('2026-07-01'),
    }, admin._id);

    const updated = await calendarService.updateEvent(school._id, event._id, { eventType: 'cultural' }, admin._id);
    expect(updated.eventType).toBe('cultural');
    expect(updated.type).toBe('cultural');
  });
});
