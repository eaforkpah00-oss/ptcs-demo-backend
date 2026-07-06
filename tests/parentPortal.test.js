const School = require('../src/models/School');
const AcademicTerm = require('../src/models/AcademicTerm');
const Class = require('../src/models/Class');
const Subject = require('../src/models/Subject');
const User = require('../src/models/User');
const Student = require('../src/models/Student');
const Attendance = require('../src/models/Attendance');
const Academic = require('../src/models/Academic');
const FeeStructure = require('../src/models/FeeStructure');
const FeeInvoice = require('../src/models/FeeInvoice');
const Book = require('../src/models/Book');
const BorrowRecord = require('../src/models/BorrowRecord');
const AuditLog = require('../src/models/AuditLog');
const parentPortalService = require('../src/modules/parentPortal/parentPortal.service');

describe('Parent portal service', () => {
  async function makeFixture() {
    const school = await School.create({ name: 'Parent Portal Demo School', email: `pp${Date.now()}@test.com` });
    const term = await AcademicTerm.create({
      school: school._id, name: 'Term 1', academicYear: '2025/2026',
      startDate: new Date('2025-09-01'), endDate: new Date('2025-12-01'), isCurrent: true,
    });
    const klass = await Class.create({ name: 'Class 1', school: school._id });
    const subject = await Subject.create({ school: school._id, name: 'Mathematics' });
    const teacher = await User.create({
      firstName: 'Kwame', lastName: 'Teacher', email: `teacher${Date.now()}@test.com`,
      password: 'password123', role: 'teacher', school: school._id,
    });
    const admin = await User.create({
      firstName: 'Admin', lastName: 'User', email: `admin${Date.now()}@test.com`,
      password: 'password123', role: 'school_admin', school: school._id,
    });
    const parent = await User.create({
      firstName: 'Parent', lastName: 'One', email: `parent${Date.now()}@test.com`,
      password: 'password123', role: 'parent', school: school._id,
    });
    const otherParent = await User.create({
      firstName: 'Other', lastName: 'Parent', email: `otherparent${Date.now()}@test.com`,
      password: 'password123', role: 'parent', school: school._id,
    });
    const child = await Student.create({
      firstName: 'Kojo', lastName: 'Mensah', school: school._id, class: klass._id, parents: [parent._id],
    });
    const otherChild = await Student.create({
      firstName: 'Ama', lastName: 'Boateng', school: school._id, class: klass._id, parents: [otherParent._id],
    });
    return {
      school, term, klass, subject, teacher, admin, parent, otherParent, child, otherChild,
    };
  }

  test('getLinkedStudents returns only this parent\'s children', async () => {
    const {
      school, parent, otherParent, child, otherChild,
    } = await makeFixture();

    const linked = await parentPortalService.getLinkedStudents(parent._id, school._id);
    expect(linked.map((s) => String(s._id))).toEqual([String(child._id)]);

    const otherLinked = await parentPortalService.getLinkedStudents(otherParent._id, school._id);
    expect(otherLinked.map((s) => String(s._id))).toEqual([String(otherChild._id)]);
  });

  test('a parent cannot access another parent\'s child data', async () => {
    const {
      school, term, parent, otherChild,
    } = await makeFixture();

    await expect(
      parentPortalService.getChildFullReport(parent._id, otherChild._id, term._id, school._id),
    ).rejects.toThrow('You are not authorized to access this student.');

    await expect(
      parentPortalService.getChildAttendance(parent._id, otherChild._id, school._id),
    ).rejects.toThrow('You are not authorized to access this student.');
  });

  test('a parent cannot view fees or borrow history for another parent\'s child via the reused fee/library services', async () => {
    const {
      school, term, parent, otherChild,
    } = await makeFixture();

    await expect(
      parentPortalService.getChildFeeStatement(parent._id, otherChild._id, term._id, school._id),
    ).rejects.toThrow("You are not authorized to view this student's fees.");

    await expect(
      parentPortalService.getChildBorrowHistory(parent._id, otherChild._id, school._id),
    ).rejects.toThrow("You are not authorized to view this student's library history.");
  });

  test('getChildDashboard returns a summary for every linked child with attendance, fees, and books', async () => {
    const {
      school, term, klass, teacher, admin, parent, child,
    } = await makeFixture();

    await Attendance.create({
      school: school._id, class: klass._id, student: child._id, date: new Date(), status: 'present',
    });
    await Attendance.create({
      school: school._id, class: klass._id, student: child._id, date: new Date('2025-10-13'), status: 'present',
    });
    await Academic.create({
      student: child._id, teacher: teacher._id, class: klass._id, school: school._id, subject: 'Mathematics',
      assessmentType: 'exam', title: 'Quiz', score: 8, maxScore: 10, date: new Date(),
    });
    const feeStructure = await FeeStructure.create({
      school: school._id, term: term._id, name: 'Tuition', amount: 100000, dueDate: new Date('2025-10-01'), createdBy: admin._id,
    });
    await FeeInvoice.create({
      school: school._id, student: child._id, feeStructure: feeStructure._id, term: term._id,
      amountDue: 100000, amountPaid: 30000, dueDate: new Date('2025-10-01'), createdBy: admin._id,
    });
    const book = await Book.create({
      school: school._id, title: 'Book A', totalCopies: 1, availableCopies: 0, createdBy: admin._id,
    });
    await BorrowRecord.create({
      school: school._id, book: book._id, student: child._id, dueDate: new Date('2026-01-01'), status: 'borrowed', createdBy: admin._id,
    });

    const dashboard = await parentPortalService.getChildDashboard(parent._id, school._id);
    expect(dashboard).toHaveLength(1);

    const [summary] = dashboard;
    expect(String(summary.student._id)).toBe(String(child._id));
    expect(summary.attendanceThisWeek).toHaveLength(1);
    expect(summary.attendancePercent).toBe(100);
    expect(summary.latestGrades).toHaveLength(1);
    expect(summary.feeBalance).toBe(70000);
    expect(summary.borrowedBooks).toHaveLength(1);
    expect(summary.currentTerm._id.toString()).toBe(String(term._id));
  });

  test('getChildFullReport combines grade average, attendance, borrow history, and fees for the term', async () => {
    const {
      school, term, klass, teacher, admin, parent, child,
    } = await makeFixture();

    await Academic.create({
      student: child._id, teacher: teacher._id, class: klass._id, school: school._id, subject: 'Mathematics',
      assessmentType: 'exam', title: 'Mid-Term', score: 85, maxScore: 100, date: new Date('2025-10-13'),
    });
    await Attendance.create({
      school: school._id, class: klass._id, student: child._id, date: new Date('2025-10-13'), status: 'present',
    });
    await Attendance.create({
      school: school._id, class: klass._id, student: child._id, date: new Date('2025-10-14'), status: 'absent',
    });
    const feeStructure = await FeeStructure.create({
      school: school._id, term: term._id, name: 'Tuition', amount: 100000, dueDate: new Date('2025-10-01'), createdBy: admin._id,
    });
    await FeeInvoice.create({
      school: school._id, student: child._id, feeStructure: feeStructure._id, term: term._id,
      amountDue: 100000, amountPaid: 100000, dueDate: new Date('2025-10-01'), createdBy: admin._id,
    });
    const book = await Book.create({
      school: school._id, title: 'Book A', totalCopies: 1, availableCopies: 1, createdBy: admin._id,
    });
    await BorrowRecord.create({
      school: school._id, book: book._id, student: child._id, borrowedAt: new Date('2025-10-05'),
      dueDate: new Date('2025-10-19'), status: 'returned', returnedAt: new Date('2025-10-18'), createdBy: admin._id,
    });

    const report = await parentPortalService.getChildFullReport(parent._id, child._id, term._id, school._id);

    expect(report.grades.average).toBe(85);
    expect(report.grades.letter).toBe('A');
    expect(report.attendance.percentage).toBe(50);
    expect(report.borrowHistory).toHaveLength(1);
    expect(report.fees.totalOutstanding).toBe(0);
  });

  test('updateOwnProfile updates phone/notificationPreferences and rejects any other field', async () => {
    const { school, parent } = await makeFixture();

    const updated = await parentPortalService.updateOwnProfile(parent._id, school._id, {
      phone: '0555123456', notificationPreferences: { channels: ['inApp', 'sms'] },
    });
    expect(updated.phone).toBe('0555123456');
    expect(updated.notificationPreferences.channels).toEqual(['inApp', 'sms']);

    const auditEntries = await AuditLog.find({ school: school._id, action: 'parent.profile.update' });
    expect(auditEntries).toHaveLength(1);

    await expect(
      parentPortalService.updateOwnProfile(parent._id, school._id, { role: 'school_admin' }),
    ).rejects.toThrow('Only phone and notificationPreferences may be updated');
  });
});
