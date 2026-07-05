const School = require('../src/models/School');
const AcademicTerm = require('../src/models/AcademicTerm');
const Class = require('../src/models/Class');
const Subject = require('../src/models/Subject');
const Student = require('../src/models/Student');
const User = require('../src/models/User');
const AuditLog = require('../src/models/AuditLog');
const Notification = require('../src/models/Notification');
const Academic = require('../src/models/Academic');
const examsService = require('../src/modules/exams/exams.service');

describe('Exams service', () => {
  async function makeFixture() {
    const school = await School.create({ name: 'Exam Demo School', email: `exam${Date.now()}@test.com` });
    const term = await AcademicTerm.create({
      school: school._id, name: 'Term 1', academicYear: '2025/2026',
      startDate: new Date('2025-09-01'), endDate: new Date('2025-12-01'), isCurrent: true,
    });
    const teacherUser = await User.create({
      firstName: 'Kwame', lastName: 'Teacher', email: `teacher${Date.now()}@test.com`,
      password: 'password123', role: 'teacher', school: school._id,
    });
    const klass = await Class.create({ name: 'Class 1', school: school._id, teacher: teacherUser._id });
    const subject = await Subject.create({ school: school._id, name: 'Mathematics' });
    const parent = await User.create({
      firstName: 'Parent', lastName: 'One', email: `parent${Date.now()}@test.com`,
      password: 'password123', role: 'parent', school: school._id,
    });
    const student = await Student.create({
      firstName: 'Kojo', lastName: 'Mensah', school: school._id, class: klass._id, parents: [parent._id],
    });
    const admin = await User.create({
      firstName: 'Admin', lastName: 'User', email: `admin${Date.now()}@test.com`,
      password: 'password123', role: 'school_admin', school: school._id,
    });
    return {
      school, term, klass, subject, teacherUser, parent, student, admin,
    };
  }

  test('scheduleExam creates the exam and notifies the class parents and class teacher', async () => {
    const {
      school, term, klass, subject, teacherUser, parent, admin,
    } = await makeFixture();

    const { exam } = await examsService.scheduleExam(school._id, {
      term: term._id, class: klass._id, subject: subject._id, title: 'Mid-Term Maths',
      examDate: new Date('2025-10-13'), startTime: '09:00', durationMins: 60, totalMarks: 100,
    }, admin._id);

    expect(exam.status).toBe('scheduled');

    const notifications = await Notification.find({ type: 'exam_reminder' });
    const recipientIds = notifications.map((n) => String(n.recipient));
    expect(recipientIds).toContain(String(parent._id));
    expect(recipientIds).toContain(String(teacherUser._id));

    const auditEntries = await AuditLog.find({ school: school._id, action: 'exam.schedule' });
    expect(auditEntries).toHaveLength(1);
  });

  test('scheduleExam with no class notifies every parent and teacher in the school', async () => {
    const {
      school, term, subject, teacherUser, parent, admin,
    } = await makeFixture();

    await examsService.scheduleExam(school._id, {
      term: term._id, class: null, subject: subject._id, title: 'Mock Exam',
      examDate: new Date('2025-10-20'), startTime: '10:00', durationMins: 90, totalMarks: 100,
    }, admin._id);

    const notifications = await Notification.find({ type: 'exam_reminder' });
    const recipientIds = notifications.map((n) => String(n.recipient));
    expect(recipientIds).toContain(String(parent._id));
    expect(recipientIds).toContain(String(teacherUser._id));
  });

  test('submitExamResults records grades on the existing Academic model and marks the exam completed', async () => {
    const {
      school, term, klass, subject, student, teacherUser, admin,
    } = await makeFixture();
    const { exam } = await examsService.scheduleExam(school._id, {
      term: term._id, class: klass._id, subject: subject._id, title: 'Mid-Term Maths',
      examDate: new Date('2025-10-13'), startTime: '09:00', durationMins: 60, totalMarks: 100,
    }, admin._id);

    const { processed, exam: updatedExam } = await examsService.submitExamResults(
      school._id, exam._id, [{ student: student._id, score: 82, remarks: 'Well done' }], teacherUser._id,
    );

    expect(processed).toBe(1);
    expect(updatedExam.status).toBe('completed');

    const gradeRecords = await Academic.find({ student: student._id, assessmentType: 'exam' });
    expect(gradeRecords).toHaveLength(1);
    expect(gradeRecords[0].score).toBe(82);
    expect(gradeRecords[0].maxScore).toBe(100);
    expect(gradeRecords[0].subject).toBe('Mathematics');

    await expect(examsService.submitExamResults(
      school._id, exam._id, [{ student: student._id, score: 50 }], teacherUser._id,
    )).rejects.toThrow('Cannot submit results for a completed exam.');
  });

  test('updateExam rejects edits to a completed exam', async () => {
    const {
      school, term, klass, subject, student, teacherUser, admin,
    } = await makeFixture();
    const { exam } = await examsService.scheduleExam(school._id, {
      term: term._id, class: klass._id, subject: subject._id, title: 'Mid-Term Maths',
      examDate: new Date('2025-10-13'), startTime: '09:00', durationMins: 60, totalMarks: 100,
    }, admin._id);
    await examsService.submitExamResults(
      school._id, exam._id, [{ student: student._id, score: 70 }], teacherUser._id,
    );

    await expect(
      examsService.updateExam(school._id, exam._id, { venue: 'Hall B' }, admin._id),
    ).rejects.toThrow('Cannot edit a completed exam.');
  });

  test('cancelExam soft-deletes the exam and notifies affected parents and teacher', async () => {
    const {
      school, term, klass, subject, teacherUser, parent, admin,
    } = await makeFixture();
    const { exam } = await examsService.scheduleExam(school._id, {
      term: term._id, class: klass._id, subject: subject._id, title: 'Mid-Term Maths',
      examDate: new Date('2025-10-13'), startTime: '09:00', durationMins: 60, totalMarks: 100,
    }, admin._id);

    const cancelled = await examsService.cancelExam(school._id, exam._id, admin._id);
    expect(cancelled.status).toBe('cancelled');
    expect(cancelled.isDeleted).toBe(true);

    const cancelNotifications = await Notification.find({ title: `Exam Cancelled: ${exam.title}` });
    const recipientIds = cancelNotifications.map((n) => String(n.recipient));
    expect(recipientIds).toContain(String(parent._id));
    expect(recipientIds).toContain(String(teacherUser._id));

    const schedule = await examsService.getExamSchedule(school._id, term._id, klass._id);
    expect(Object.keys(schedule)).toHaveLength(0);
  });

  test('getExamSchedule groups exams by date and includes school-wide exams for any class', async () => {
    const {
      school, term, klass, subject, admin,
    } = await makeFixture();
    await examsService.scheduleExam(school._id, {
      term: term._id, class: klass._id, subject: subject._id, title: 'Mid-Term Maths',
      examDate: new Date('2025-10-13'), startTime: '09:00', durationMins: 60, totalMarks: 100,
    }, admin._id);
    await examsService.scheduleExam(school._id, {
      term: term._id, class: null, subject: subject._id, title: 'Mock Exam',
      examDate: new Date('2025-10-20'), startTime: '10:00', durationMins: 90, totalMarks: 100,
    }, admin._id);

    const schedule = await examsService.getExamSchedule(school._id, term._id, klass._id);
    expect(Object.keys(schedule).sort()).toEqual(['2025-10-13', '2025-10-20']);
  });
});
