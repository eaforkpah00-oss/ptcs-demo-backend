const Exam = require('../../models/Exam');
const Subject = require('../../models/Subject');
const Class = require('../../models/Class');
const Student = require('../../models/Student');
const User = require('../../models/User');
const Academic = require('../../models/Academic');
const Timetable = require('../../models/Timetable');
const AuditLog = require('../../models/AuditLog');
const AppError = require('../../utils/appError');
const { sendNotification } = require('../../services/notification.service');

const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

// Non-blocking check: exams are scheduled independently of the timetable, so this only
// warns the caller — it never prevents scheduleExam/updateExam from proceeding.
async function checkTimetableClash(schoolId, classId, term, examDate, startTime) {
  if (!classId) return null;
  const dayOfWeek = DAY_NAMES[new Date(examDate).getDay()];
  if (!WEEKDAYS.includes(dayOfWeek)) return null;

  const clash = await Timetable.findOne({
    school: schoolId, class: classId, term, dayOfWeek, startTime, isDeleted: false,
  });
  return clash ? `Class already has a scheduled period at ${startTime} on ${dayOfWeek}.` : null;
}

async function notifyForExam(schoolId, exam, title, body) {
  let recipients;
  if (exam.class) {
    const [students, klass] = await Promise.all([
      Student.find({ school: schoolId, class: exam.class, isActive: true }),
      Class.findById(exam.class),
    ]);
    recipients = students.flatMap((s) => s.parents || []);
    if (klass && klass.teacher) recipients.push(klass.teacher);
  } else {
    const [parents, teachers] = await Promise.all([
      User.find({ school: schoolId, role: 'parent', isActive: true }),
      User.find({ school: schoolId, role: 'teacher', isActive: true }),
    ]);
    recipients = [...parents.map((p) => p._id), ...teachers.map((t) => t._id)];
  }

  const uniqueRecipients = [...new Set(recipients.map(String))];
  await Promise.all(uniqueRecipients.map((id) => sendNotification(
    id, 'exam_reminder', title, body, { schoolId, examId: exam._id }, ['inApp'],
  )));
}

async function scheduleExam(schoolId, data, adminId) {
  const warning = await checkTimetableClash(schoolId, data.class, data.term, data.examDate, data.startTime);

  const exam = await Exam.create({
    school: schoolId,
    term: data.term,
    class: data.class || null,
    subject: data.subject,
    title: data.title,
    examDate: data.examDate,
    startTime: data.startTime,
    durationMins: data.durationMins,
    venue: data.venue || null,
    totalMarks: data.totalMarks,
    instructions: data.instructions || null,
    createdBy: adminId,
  });

  await notifyForExam(
    schoolId, exam,
    `Exam Scheduled: ${exam.title}`,
    `${exam.title} scheduled for ${exam.examDate.toDateString()} at ${exam.startTime}. Venue: ${exam.venue || 'TBA'}.`,
  );

  await AuditLog.record({
    school: schoolId, user: adminId, action: 'exam.schedule',
    targetId: exam._id, targetType: 'Exam', metadata: warning ? { warning } : {},
  });

  return { exam, warning };
}

async function submitExamResults(schoolId, examId, grades, teacherId) {
  const exam = await Exam.findOne({ _id: examId, school: schoolId, isDeleted: false });
  if (!exam) throw new AppError('Exam not found.', 404);
  if (!['scheduled', 'ongoing'].includes(exam.status)) {
    throw new AppError(`Cannot submit results for a ${exam.status} exam.`, 400);
  }

  const subjectDoc = await Subject.findById(exam.subject);
  const subjectName = subjectDoc ? subjectDoc.name : 'Unknown';

  // Reuses the existing Academic model/collection (Phase 1's grade records) rather than
  // inventing a parallel results store — Phase 1 has no bulk-grade service to call into.
  let processed = 0;
  for (const entry of grades) {
    await Academic.create({
      student: entry.student,
      teacher: teacherId,
      class: exam.class,
      school: schoolId,
      subject: subjectName,
      assessmentType: 'exam',
      title: exam.title,
      score: entry.score,
      maxScore: exam.totalMarks,
      feedback: entry.remarks || undefined,
      date: exam.examDate,
    });
    processed += 1;
  }

  exam.status = 'completed';
  await exam.save();

  await AuditLog.record({
    school: schoolId, user: teacherId, action: 'exam.results.submit',
    targetId: exam._id, targetType: 'Exam', metadata: { processed },
  });

  return { processed, exam };
}

async function getExamResults(schoolId, examId) {
  const exam = await Exam.findOne({ _id: examId, school: schoolId, isDeleted: false });
  if (!exam) throw new AppError('Exam not found.', 404);

  const subjectDoc = await Subject.findById(exam.subject);

  // Academic has no examId field (Rule 1 forbids touching that model), so results are
  // correlated back to this exam via the same subject/title/class/date it was created with.
  const filter = {
    school: schoolId,
    assessmentType: 'exam',
    title: exam.title,
    date: exam.examDate,
  };
  if (subjectDoc) filter.subject = subjectDoc.name;
  if (exam.class) filter.class = exam.class;

  const results = await Academic.find(filter).populate('student', 'firstName lastName');
  return { exam, results };
}

async function updateExam(schoolId, examId, data, adminId) {
  const exam = await Exam.findOne({ _id: examId, school: schoolId, isDeleted: false });
  if (!exam) throw new AppError('Exam not found.', 404);
  if (exam.status === 'completed') throw new AppError('Cannot edit a completed exam.', 403);

  const dateOrTimeChanged = 'examDate' in data || 'startTime' in data;
  Object.assign(exam, data, { updatedBy: adminId });

  let warning = null;
  if (dateOrTimeChanged) {
    warning = await checkTimetableClash(schoolId, exam.class, exam.term, exam.examDate, exam.startTime);
  }

  await exam.save();

  await AuditLog.record({
    school: schoolId, user: adminId, action: 'exam.update',
    targetId: exam._id, targetType: 'Exam', metadata: warning ? { warning } : {},
  });

  return { exam, warning };
}

async function cancelExam(schoolId, examId, adminId) {
  const exam = await Exam.findOne({ _id: examId, school: schoolId, isDeleted: false });
  if (!exam) throw new AppError('Exam not found.', 404);

  exam.status = 'cancelled';
  exam.isDeleted = true;
  exam.deletedAt = new Date();
  exam.updatedBy = adminId;
  await exam.save();

  await notifyForExam(
    schoolId, exam,
    `Exam Cancelled: ${exam.title}`,
    `${exam.title} scheduled for ${exam.examDate.toDateString()} has been cancelled.`,
  );

  await AuditLog.record({
    school: schoolId, user: adminId, action: 'exam.cancel',
    targetId: exam._id, targetType: 'Exam',
  });

  return exam;
}

async function getExamSchedule(schoolId, termId, classId) {
  const filter = { school: schoolId, term: termId, isDeleted: false };
  if (classId) filter.$or = [{ class: classId }, { class: null }];

  const exams = await Exam.find(filter)
    .populate('subject', 'name')
    .populate('class', 'name')
    .sort('examDate');

  const grouped = {};
  for (const exam of exams) {
    const key = exam.examDate.toISOString().slice(0, 10);
    (grouped[key] = grouped[key] || []).push(exam);
  }
  return grouped;
}

async function sendExamReminders(schoolId) {
  const target = new Date();
  target.setDate(target.getDate() + 3);
  const startOfDay = new Date(target.getFullYear(), target.getMonth(), target.getDate(), 0, 0, 0, 0);
  const endOfDay = new Date(target.getFullYear(), target.getMonth(), target.getDate(), 23, 59, 59, 999);

  const exams = await Exam.find({
    school: schoolId, status: 'scheduled', isDeleted: false,
    examDate: { $gte: startOfDay, $lte: endOfDay },
  });

  for (const exam of exams) {
    await notifyForExam(
      schoolId, exam,
      `Exam Reminder: ${exam.title}`,
      `Reminder: ${exam.title} is scheduled in 3 days on ${exam.examDate.toDateString()} at ${exam.startTime}.`,
    );
  }

  await AuditLog.record({
    school: schoolId, action: 'exam.reminders.send', metadata: { remindersSent: exams.length },
  });

  return { remindersSent: exams.length };
}

module.exports = {
  scheduleExam,
  submitExamResults,
  getExamResults,
  updateExam,
  cancelExam,
  getExamSchedule,
  sendExamReminders,
};
