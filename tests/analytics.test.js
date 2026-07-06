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
const Message = require('../src/models/Message');
const LeaveRequest = require('../src/models/LeaveRequest');
const Book = require('../src/models/Book');
const BorrowRecord = require('../src/models/BorrowRecord');
const analyticsService = require('../src/modules/analytics/analytics.service');

describe('Analytics service', () => {
  async function makeFixture() {
    const school = await School.create({ name: 'Analytics Demo School', email: `an${Date.now()}@test.com` });
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
    const parent = await User.create({
      firstName: 'Parent', lastName: 'One', email: `parent${Date.now()}@test.com`,
      password: 'password123', role: 'parent', school: school._id,
    });
    const admin = await User.create({
      firstName: 'Admin', lastName: 'User', email: `admin${Date.now()}@test.com`,
      password: 'password123', role: 'school_admin', school: school._id,
    });
    return {
      school, term, klass, subject, teacher, parent, admin,
    };
  }

  test('getSchoolOverview aggregates counts across every module to match the seeded fixture', async () => {
    const {
      school, term, klass, teacher, parent, admin,
    } = await makeFixture();

    const student1 = await Student.create({
      firstName: 'Kojo', lastName: 'Mensah', school: school._id, class: klass._id, parents: [parent._id],
    });
    const student2 = await Student.create({
      firstName: 'Ama', lastName: 'Boateng', school: school._id, class: klass._id, parents: [parent._id],
    });

    const today = new Date();
    today.setUTCHours(12, 0, 0, 0);
    await Attendance.create({
      school: school._id, class: klass._id, student: student1._id, date: today, status: 'present',
    });
    await Attendance.create({
      school: school._id, class: klass._id, student: student2._id, date: today, status: 'absent',
    });

    const feeStructure = await FeeStructure.create({
      school: school._id, term: term._id, name: 'Tuition', amount: 100000, dueDate: new Date('2025-10-01'), createdBy: admin._id,
    });
    await FeeInvoice.create({
      school: school._id, student: student1._id, feeStructure: feeStructure._id, term: term._id,
      amountDue: 100000, amountPaid: 50000, dueDate: new Date('2025-10-01'), createdBy: admin._id,
    });

    await Message.create({
      sender: teacher._id, recipient: admin._id, school: school._id, subject: 'Hi', content: 'Hello', isRead: false,
    });

    await LeaveRequest.create({
      school: school._id, staff: teacher._id, leaveType: 'sick', startDate: new Date(), endDate: new Date(),
      totalDays: 1, reason: 'Flu', status: 'pending',
    });

    const book = await Book.create({
      school: school._id, title: 'Book A', totalCopies: 1, availableCopies: 0, createdBy: admin._id,
    });
    await BorrowRecord.create({
      school: school._id, book: book._id, student: student1._id, dueDate: new Date('2000-01-01'), status: 'overdue', createdBy: admin._id,
    });

    const overview = await analyticsService.getSchoolOverview(school._id, term._id);

    expect(overview.totalStudents).toBe(2);
    expect(overview.totalTeachers).toBe(1);
    expect(overview.totalParents).toBe(1);
    expect(overview.attendanceRateToday).toBe(50);
    expect(overview.feeCollectionRate).toBe(50);
    expect(overview.unreadMessages).toBe(1);
    expect(overview.pendingLeaveRequests).toBe(1);
    expect(overview.overdueBooks).toBe(1);
    expect(Array.isArray(overview.upcomingEvents)).toBe(true);
  });

  test('getSchoolOverview throws for a term that does not belong to the school', async () => {
    const { school } = await makeFixture();
    const otherSchool = await School.create({ name: 'Other School', email: `other${Date.now()}@test.com` });
    const otherTerm = await AcademicTerm.create({
      school: otherSchool._id, name: 'Term 1', academicYear: '2025/2026',
      startDate: new Date('2025-09-01'), endDate: new Date('2025-12-01'),
    });

    await expect(analyticsService.getSchoolOverview(school._id, otherTerm._id)).rejects.toThrow('Academic term not found.');
  });

  test('getAttendanceTrend groups records by date and computes the present+tardy percentage', async () => {
    const { school, klass } = await makeFixture();
    const student = await Student.create({ firstName: 'Kojo', lastName: 'Mensah', school: school._id, class: klass._id });

    const day1 = new Date();
    day1.setUTCHours(12, 0, 0, 0);
    const day2 = new Date(day1);
    day2.setUTCDate(day2.getUTCDate() - 1);

    await Attendance.create({ school: school._id, class: klass._id, student: student._id, date: day1, status: 'present' });
    const student2 = await Student.create({ firstName: 'Ama', lastName: 'Boateng', school: school._id, class: klass._id });
    await Attendance.create({ school: school._id, class: klass._id, student: student2._id, date: day1, status: 'tardy' });
    await Attendance.create({ school: school._id, class: klass._id, student: student._id, date: day2, status: 'absent' });

    const trend = await analyticsService.getAttendanceTrend(school._id);
    expect(trend).toHaveLength(2);

    const day1Key = day1.toISOString().slice(0, 10);
    const day1Row = trend.find((r) => r.date === day1Key);
    expect(day1Row.presentCount).toBe(1);
    expect(day1Row.lateCount).toBe(1);
    expect(day1Row.percentage).toBe(100);

    const day2Key = day2.toISOString().slice(0, 10);
    const day2Row = trend.find((r) => r.date === day2Key);
    expect(day2Row.absentCount).toBe(1);
    expect(day2Row.percentage).toBe(0);
  });

  test('getGradeDistribution buckets scores into letter grades using the school grading scale', async () => {
    const {
      school, term, klass, subject, teacher,
    } = await makeFixture();
    const student1 = await Student.create({ firstName: 'Kojo', lastName: 'Mensah', school: school._id, class: klass._id });
    const student2 = await Student.create({ firstName: 'Ama', lastName: 'Boateng', school: school._id, class: klass._id });

    await Academic.create({
      student: student1._id, teacher: teacher._id, class: klass._id, school: school._id, subject: subject.name,
      assessmentType: 'exam', title: 'Mid-Term', score: 85, maxScore: 100, date: new Date('2025-10-13'),
    });
    await Academic.create({
      student: student2._id, teacher: teacher._id, class: klass._id, school: school._id, subject: subject.name,
      assessmentType: 'exam', title: 'Mid-Term', score: 42, maxScore: 100, date: new Date('2025-10-13'),
    });

    const distribution = await analyticsService.getGradeDistribution(school._id, term._id);
    expect(distribution.A).toBe(1);
    expect(distribution.F).toBe(1);
    expect(distribution.total).toBe(2);
  });

  test('getFeeCollectionByClass sums invoices per class and returns a school-wide summary', async () => {
    const {
      school, term, klass, admin,
    } = await makeFixture();
    const student = await Student.create({ firstName: 'Kojo', lastName: 'Mensah', school: school._id, class: klass._id });
    const feeStructure = await FeeStructure.create({
      school: school._id, term: term._id, name: 'Tuition', amount: 100000, dueDate: new Date('2025-10-01'), createdBy: admin._id,
    });
    await FeeInvoice.create({
      school: school._id, student: student._id, feeStructure: feeStructure._id, term: term._id,
      amountDue: 100000, amountPaid: 40000, dueDate: new Date('2025-10-01'), createdBy: admin._id,
    });

    const result = await analyticsService.getFeeCollectionByClass(school._id, term._id);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].className).toBe('Class 1');
    expect(result.rows[0].outstanding).toBe(60000);
    expect(result.summary.totalDue).toBe(100000);
    expect(result.summary.collectionRate).toBe(40);
  });

  test('getStudentAtRisk flags low attendance or low grade average and excludes healthy students', async () => {
    const {
      school, term, klass, subject, teacher, parent,
    } = await makeFixture();
    const atRiskStudent = await Student.create({
      firstName: 'Kojo', lastName: 'Mensah', school: school._id, class: klass._id, parents: [parent._id],
    });
    const healthyStudent = await Student.create({
      firstName: 'Ama', lastName: 'Boateng', school: school._id, class: klass._id, parents: [parent._id],
    });

    // At-risk: 1 present out of 5 records (20% attendance) within the term.
    const baseDate = new Date('2025-09-10');
    await Attendance.create({ school: school._id, class: klass._id, student: atRiskStudent._id, date: baseDate, status: 'present' });
    for (let i = 1; i <= 4; i += 1) {
      const d = new Date(baseDate);
      d.setUTCDate(d.getUTCDate() + i);
      await Attendance.create({ school: school._id, class: klass._id, student: atRiskStudent._id, date: d, status: 'absent' });
    }

    // Healthy student: good grades.
    await Academic.create({
      student: healthyStudent._id, teacher: teacher._id, class: klass._id, school: school._id, subject: subject.name,
      assessmentType: 'exam', title: 'Mid-Term', score: 90, maxScore: 100, date: new Date('2025-10-13'),
    });

    const atRisk = await analyticsService.getStudentAtRisk(school._id, term._id);
    const flaggedIds = atRisk.map((r) => String(r.student._id));

    expect(flaggedIds).toContain(String(atRiskStudent._id));
    expect(flaggedIds).not.toContain(String(healthyStudent._id));

    const flagged = atRisk.find((r) => String(r.student._id) === String(atRiskStudent._id));
    expect(flagged.attendancePercent).toBeLessThan(70);
    expect(flagged.parents[0]._id.toString()).toBe(String(parent._id));
  });
});
