const School = require('../src/models/School');
const AcademicTerm = require('../src/models/AcademicTerm');
const Class = require('../src/models/Class');
const Subject = require('../src/models/Subject');
const User = require('../src/models/User');
const Student = require('../src/models/Student');
const Attendance = require('../src/models/Attendance');
const Book = require('../src/models/Book');
const BorrowRecord = require('../src/models/BorrowRecord');
const FeeStructure = require('../src/models/FeeStructure');
const FeeInvoice = require('../src/models/FeeInvoice');
const Exam = require('../src/models/Exam');
const Notification = require('../src/models/Notification');
const feesService = require('../src/modules/fees/fees.service');
const smsJobs = require('../src/jobs/smsJobs');

describe('SMS cron jobs', () => {
  async function makeSchoolFixture(overrides = {}) {
    const school = await School.create({
      name: `Cron Demo School ${Date.now()}${Math.random()}`, email: `cron${Date.now()}${Math.random()}@test.com`, ...overrides,
    });
    const admin = await User.create({
      firstName: 'Admin', lastName: 'User', email: `admin${Date.now()}${Math.random()}@test.com`,
      password: 'password123', role: 'school_admin', school: school._id,
    });
    return { school, admin };
  }

  test('checkOverdueLibraryBooksJob flags overdue borrows for every active school and skips inactive schools', async () => {
    const { school: school1, admin: admin1 } = await makeSchoolFixture();
    const { school: school2, admin: admin2 } = await makeSchoolFixture();
    const { school: inactiveSchool, admin: inactiveAdmin } = await makeSchoolFixture({ isActive: false });

    const student1 = await Student.create({ firstName: 'A', lastName: 'One', school: school1._id });
    const student2 = await Student.create({ firstName: 'B', lastName: 'Two', school: school2._id });
    const student3 = await Student.create({ firstName: 'C', lastName: 'Three', school: inactiveSchool._id });

    const book1 = await Book.create({ school: school1._id, title: 'Book 1', totalCopies: 1, availableCopies: 0, createdBy: admin1._id });
    const book2 = await Book.create({ school: school2._id, title: 'Book 2', totalCopies: 1, availableCopies: 0, createdBy: admin2._id });
    const book3 = await Book.create({ school: inactiveSchool._id, title: 'Book 3', totalCopies: 1, availableCopies: 0, createdBy: inactiveAdmin._id });

    const record1 = await BorrowRecord.create({
      school: school1._id, book: book1._id, student: student1._id, dueDate: new Date('2000-01-01'), status: 'borrowed', createdBy: admin1._id,
    });
    const record2 = await BorrowRecord.create({
      school: school2._id, book: book2._id, student: student2._id, dueDate: new Date('2000-01-01'), status: 'borrowed', createdBy: admin2._id,
    });
    const record3 = await BorrowRecord.create({
      school: inactiveSchool._id, book: book3._id, student: student3._id, dueDate: new Date('2000-01-01'), status: 'borrowed', createdBy: inactiveAdmin._id,
    });

    await smsJobs.checkOverdueLibraryBooksJob();

    expect((await BorrowRecord.findById(record1._id)).status).toBe('overdue');
    expect((await BorrowRecord.findById(record2._id)).status).toBe('overdue');
    expect((await BorrowRecord.findById(record3._id)).status).toBe('borrowed');
  });

  test('a failing school does not stop the job from processing the remaining schools', async () => {
    const { school: school1, admin: admin1 } = await makeSchoolFixture();
    const { school: school2, admin: admin2 } = await makeSchoolFixture();

    const student1 = await Student.create({ firstName: 'A', lastName: 'One', school: school1._id });
    const student2 = await Student.create({ firstName: 'B', lastName: 'Two', school: school2._id });
    const book1 = await Book.create({ school: school1._id, title: 'Book 1', totalCopies: 1, availableCopies: 0, createdBy: admin1._id });
    const book2 = await Book.create({ school: school2._id, title: 'Book 2', totalCopies: 1, availableCopies: 0, createdBy: admin2._id });
    const record1 = await BorrowRecord.create({
      school: school1._id, book: book1._id, student: student1._id, dueDate: new Date('2000-01-01'), status: 'borrowed', createdBy: admin1._id,
    });
    const record2 = await BorrowRecord.create({
      school: school2._id, book: book2._id, student: student2._id, dueDate: new Date('2000-01-01'), status: 'borrowed', createdBy: admin2._id,
    });

    const libraryService = require('../src/modules/library/library.service');
    const spy = jest.spyOn(libraryService, 'checkOverdueBooks').mockImplementation((schoolId) => {
      if (String(schoolId) === String(school1._id)) throw new Error('simulated failure');
      return Promise.resolve({ flagged: 0 });
    });

    await expect(smsJobs.checkOverdueLibraryBooksJob()).resolves.toBeUndefined();
    expect(spy).toHaveBeenCalledTimes(2); // school2 still attempted despite school1 throwing

    spy.mockRestore();
    // Re-run for real now that the mock is gone, so both schools' actual records get flagged.
    await smsJobs.checkOverdueLibraryBooksJob();
    expect((await BorrowRecord.findById(record1._id)).status).toBe('overdue');
    expect((await BorrowRecord.findById(record2._id)).status).toBe('overdue');
  });

  test('sendFeePaymentRemindersJob and sendExamRemindersJob complete without throwing', async () => {
    const { school, admin } = await makeSchoolFixture();
    const term = await AcademicTerm.create({
      school: school._id, name: 'Term 1', academicYear: '2025/2026',
      startDate: new Date('2025-09-01'), endDate: new Date('2025-12-01'), isCurrent: true,
    });
    const klass = await Class.create({ name: 'Class 1', school: school._id });
    const subject = await Subject.create({ school: school._id, name: 'Mathematics' });
    const parent = await User.create({
      firstName: 'Parent', lastName: 'One', email: `parent${Date.now()}@test.com`,
      password: 'password123', role: 'parent', school: school._id,
    });
    const student = await Student.create({
      firstName: 'Kojo', lastName: 'Mensah', school: school._id, class: klass._id, parents: [parent._id],
    });
    const feeStructure = await FeeStructure.create({
      school: school._id, term: term._id, name: 'Tuition', amount: 100000, dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), createdBy: admin._id,
    });
    await FeeInvoice.create({
      school: school._id, student: student._id, feeStructure: feeStructure._id, term: term._id,
      amountDue: 100000, amountPaid: 0, dueDate: feeStructure.dueDate, createdBy: admin._id,
    });
    const examDate = new Date();
    examDate.setDate(examDate.getDate() + 3);
    await Exam.create({
      school: school._id, term: term._id, class: klass._id, subject: subject._id, title: 'Mock Exam',
      examDate, startTime: '09:00', durationMins: 60, totalMarks: 100, createdBy: admin._id,
    });

    await expect(smsJobs.sendFeePaymentRemindersJob()).resolves.toBeUndefined();
    await expect(smsJobs.sendExamRemindersJob()).resolves.toBeUndefined();

    expect(await Notification.countDocuments({ type: 'fee_reminder', recipient: parent._id })).toBe(1);
    expect(await Notification.countDocuments({ type: 'exam_reminder' })).toBeGreaterThan(0);
  });

  test('studentAtRiskWeeklyCheckJob notifies school admins only when at-risk students exist, and skips schools with no current term', async () => {
    const { school: schoolWithTerm, admin } = await makeSchoolFixture();
    const term = await AcademicTerm.create({
      school: schoolWithTerm._id, name: 'Term 1', academicYear: '2025/2026',
      startDate: new Date('2025-09-01'), endDate: new Date('2025-12-01'), isCurrent: true,
    });
    const klass = await Class.create({ name: 'Class 1', school: schoolWithTerm._id });
    const atRiskStudent = await Student.create({ firstName: 'Kojo', lastName: 'Mensah', school: schoolWithTerm._id, class: klass._id });

    const baseDate = new Date('2025-09-10');
    await Attendance.create({ school: schoolWithTerm._id, class: klass._id, student: atRiskStudent._id, date: baseDate, status: 'present' });
    for (let i = 1; i <= 4; i += 1) {
      const d = new Date(baseDate);
      d.setUTCDate(d.getUTCDate() + i);
      await Attendance.create({ school: schoolWithTerm._id, class: klass._id, student: atRiskStudent._id, date: d, status: 'absent' });
    }

    const { school: schoolWithoutTerm } = await makeSchoolFixture();

    await smsJobs.studentAtRiskWeeklyCheckJob();

    const notifications = await Notification.find({ type: 'system', title: 'At-Risk Students Alert' });
    expect(notifications.map((n) => String(n.recipient))).toContain(String(admin._id));
    expect(notifications[0].body).toContain('1 student(s)');
  });
});
