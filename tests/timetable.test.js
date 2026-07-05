const School = require('../src/models/School');
const AcademicTerm = require('../src/models/AcademicTerm');
const Class = require('../src/models/Class');
const Subject = require('../src/models/Subject');
const User = require('../src/models/User');
const AuditLog = require('../src/models/AuditLog');
const Timetable = require('../src/models/Timetable');
const timetableService = require('../src/modules/timetable/timetable.service');

describe('Timetable service', () => {
  async function makeFixture() {
    const school = await School.create({ name: 'Timetable Demo School', email: `tt${Date.now()}@test.com` });
    const term = await AcademicTerm.create({
      school: school._id, name: 'Term 1', academicYear: '2025/2026',
      startDate: new Date('2025-09-01'), endDate: new Date('2025-12-01'), isCurrent: true,
    });
    const klass = await Class.create({ name: 'Class 1', school: school._id });
    const otherClass = await Class.create({ name: 'Class 2', school: school._id });
    const subject = await Subject.create({ school: school._id, name: 'Mathematics' });
    const otherSubject = await Subject.create({ school: school._id, name: 'English' });
    const teacher = await User.create({
      firstName: 'Kwame', lastName: 'Teacher', email: `teacher${Date.now()}@test.com`,
      password: 'password123', role: 'teacher', school: school._id,
    });
    const admin = await User.create({
      firstName: 'Admin', lastName: 'User', email: `admin${Date.now()}@test.com`,
      password: 'password123', role: 'school_admin', school: school._id,
    });
    return { school, term, klass, otherClass, subject, otherSubject, teacher, admin };
  }

  test('createPeriod creates a period and logs an audit entry', async () => {
    const { school, term, klass, subject, teacher, admin } = await makeFixture();
    const period = await timetableService.createPeriod(school._id, {
      class: klass._id, term: term._id, dayOfWeek: 'monday', periodNumber: 1,
      startTime: '08:00', endTime: '08:45', subject: subject._id, teacher: teacher._id,
    }, admin._id);

    expect(period.dayOfWeek).toBe('monday');
    const auditEntries = await AuditLog.find({ school: school._id, action: 'timetable.period.create' });
    expect(auditEntries).toHaveLength(1);
  });

  test('createPeriod rejects a teacher double-booking', async () => {
    const {
      school, term, klass, otherClass, subject, otherSubject, teacher, admin,
    } = await makeFixture();
    await timetableService.createPeriod(school._id, {
      class: klass._id, term: term._id, dayOfWeek: 'monday', periodNumber: 1,
      startTime: '08:00', endTime: '08:45', subject: subject._id, teacher: teacher._id,
    }, admin._id);

    await expect(timetableService.createPeriod(school._id, {
      class: otherClass._id, term: term._id, dayOfWeek: 'monday', periodNumber: 1,
      startTime: '08:00', endTime: '08:45', subject: otherSubject._id, teacher: teacher._id,
    }, admin._id)).rejects.toThrow('Teacher already has a class at this time.');
  });

  test('createPeriod rejects a class double-booking', async () => {
    const { school, term, klass, subject, otherSubject, teacher, admin } = await makeFixture();
    const otherTeacher = await User.create({
      firstName: 'Ama', lastName: 'Teacher', email: `teacher2${Date.now()}@test.com`,
      password: 'password123', role: 'teacher', school: school._id,
    });
    await timetableService.createPeriod(school._id, {
      class: klass._id, term: term._id, dayOfWeek: 'monday', periodNumber: 1,
      startTime: '08:00', endTime: '08:45', subject: subject._id, teacher: teacher._id,
    }, admin._id);

    await expect(timetableService.createPeriod(school._id, {
      class: klass._id, term: term._id, dayOfWeek: 'monday', periodNumber: 1,
      startTime: '08:00', endTime: '08:45', subject: otherSubject._id, teacher: otherTeacher._id,
    }, admin._id)).rejects.toThrow('This class already has a subject at this time.');
  });

  test('getClassTimetable groups periods by day sorted by period number', async () => {
    const { school, term, klass, subject, otherSubject, teacher, admin } = await makeFixture();
    await timetableService.createPeriod(school._id, {
      class: klass._id, term: term._id, dayOfWeek: 'monday', periodNumber: 2,
      startTime: '09:00', endTime: '09:45', subject: otherSubject._id, teacher: teacher._id,
    }, admin._id);
    await timetableService.createPeriod(school._id, {
      class: klass._id, term: term._id, dayOfWeek: 'monday', periodNumber: 1,
      startTime: '08:00', endTime: '08:45', subject: subject._id, teacher: teacher._id,
    }, admin._id);

    const timetable = await timetableService.getClassTimetable(school._id, klass._id, term._id);
    expect(timetable.monday.map((p) => p.periodNumber)).toEqual([1, 2]);
    expect(timetable.tuesday).toEqual([]);
  });

  test('deletePeriod soft deletes and frees the slot for a new booking', async () => {
    const { school, term, klass, subject, teacher, admin } = await makeFixture();
    const period = await timetableService.createPeriod(school._id, {
      class: klass._id, term: term._id, dayOfWeek: 'monday', periodNumber: 1,
      startTime: '08:00', endTime: '08:45', subject: subject._id, teacher: teacher._id,
    }, admin._id);

    await timetableService.deletePeriod(school._id, period._id, admin._id);

    const reCreated = await timetableService.createPeriod(school._id, {
      class: klass._id, term: term._id, dayOfWeek: 'monday', periodNumber: 1,
      startTime: '08:00', endTime: '08:45', subject: subject._id, teacher: teacher._id,
    }, admin._id);
    expect(reCreated).toBeTruthy();

    const auditEntries = await AuditLog.find({ school: school._id, action: 'timetable.period.delete' });
    expect(auditEntries).toHaveLength(1);
  });

  test('detectConflicts flags a teacher double-booked across two classes', async () => {
    const {
      school, term, klass, otherClass, subject, otherSubject, teacher, admin,
    } = await makeFixture();
    // Bypass the service's conflict checks to simulate data that predates this module
    // (e.g. a bulk import) so detectConflicts has something to catch.
    await Timetable.create({
      school: school._id, class: klass._id, term: term._id, dayOfWeek: 'monday', periodNumber: 1,
      startTime: '08:00', endTime: '08:45', subject: subject._id, teacher: teacher._id,
      room: 'Room A', createdBy: admin._id,
    });
    await Timetable.create({
      school: school._id, class: otherClass._id, term: term._id, dayOfWeek: 'monday', periodNumber: 1,
      startTime: '08:00', endTime: '08:45', subject: otherSubject._id, teacher: teacher._id,
      room: 'Room A', createdBy: admin._id,
    });

    const { teacherConflicts, roomConflicts } = await timetableService.detectConflicts(school._id, term._id);
    expect(teacherConflicts).toHaveLength(1);
    expect(teacherConflicts[0]).toHaveLength(2);
    expect(roomConflicts).toHaveLength(1);
  });
});
