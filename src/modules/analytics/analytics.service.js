const Student = require('../../models/Student');
const User = require('../../models/User');
const Attendance = require('../../models/Attendance');
const Academic = require('../../models/Academic');
const AcademicTerm = require('../../models/AcademicTerm');
const FeeInvoice = require('../../models/FeeInvoice');
const Message = require('../../models/Message');
const LeaveRequest = require('../../models/LeaveRequest');
const BorrowRecord = require('../../models/BorrowRecord');
const Subject = require('../../models/Subject');
const School = require('../../models/School');
const AppError = require('../../utils/appError');
const calendarService = require('../calendar/calendar.service');

const PRESENT_STATUSES = ['present', 'tardy'];
const DEFAULT_GRADING_SCALE = [
  { min: 80, max: 100, grade: 'A' },
  { min: 70, max: 79, grade: 'B' },
  { min: 60, max: 69, grade: 'C' },
  { min: 50, max: 59, grade: 'D' },
  { min: 0, max: 49, grade: 'F' },
];

function startOfDayUTC(date) {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function endOfDayUTC(date) {
  const d = new Date(date);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

function round1(value) {
  return Math.round(value * 10) / 10;
}

async function getTerm(schoolId, termId) {
  const term = await AcademicTerm.findOne({ _id: termId, school: schoolId });
  if (!term) throw new AppError('Academic term not found.', 404);
  return term;
}

function computeLetterGrade(score, maxScore, gradingScale) {
  const percent = (score / maxScore) * 100;
  const bucket = gradingScale.find((g) => percent >= g.min && percent <= g.max);
  return bucket ? bucket.grade : null;
}

async function getSchoolOverview(schoolId, termId) {
  await getTerm(schoolId, termId);
  const todayStart = startOfDayUTC(new Date());
  const todayEnd = endOfDayUTC(new Date());

  const [
    totalStudents, totalTeachers, totalParents,
    todaysAttendance, feeInvoices,
    unreadMessages, upcomingEvents, pendingLeaveRequests, overdueBooks,
  ] = await Promise.all([
    Student.countDocuments({ school: schoolId, isActive: true }),
    User.countDocuments({ school: schoolId, role: 'teacher', isActive: true }),
    User.countDocuments({ school: schoolId, role: 'parent', isActive: true }),
    Attendance.find({ school: schoolId, date: { $gte: todayStart, $lte: todayEnd } }),
    FeeInvoice.find({ school: schoolId, term: termId, isDeleted: false }),
    Message.countDocuments({ school: schoolId, isRead: false }),
    calendarService.getUpcomingEvents(schoolId, 3),
    LeaveRequest.countDocuments({ school: schoolId, status: 'pending', isDeleted: false }),
    BorrowRecord.countDocuments({ school: schoolId, status: 'overdue', isDeleted: false }),
  ]);

  const presentToday = todaysAttendance.filter((a) => PRESENT_STATUSES.includes(a.status)).length;
  const attendanceRateToday = todaysAttendance.length ? round1((presentToday / todaysAttendance.length) * 100) : 0;

  const totalDue = feeInvoices.reduce((sum, inv) => sum + inv.amountDue, 0);
  const totalPaid = feeInvoices.reduce((sum, inv) => sum + inv.amountPaid, 0);
  const feeCollectionRate = totalDue ? round1((totalPaid / totalDue) * 100) : 0;

  return {
    totalStudents,
    totalTeachers,
    totalParents,
    attendanceRateToday,
    feeCollectionRate,
    unreadMessages,
    upcomingEvents,
    pendingLeaveRequests,
    overdueBooks,
  };
}

async function getAttendanceTrend(schoolId, classId, weeks = 8) {
  const startDate = startOfDayUTC(new Date());
  startDate.setUTCDate(startDate.getUTCDate() - weeks * 7);

  const filter = { school: schoolId, date: { $gte: startDate } };
  if (classId) filter.class = classId;

  const records = await Attendance.find(filter);

  const byDate = {};
  for (const record of records) {
    const key = record.date.toISOString().slice(0, 10);
    if (!byDate[key]) byDate[key] = { present: 0, absent: 0, tardy: 0, excused: 0 };
    byDate[key][record.status] += 1;
  }

  return Object.keys(byDate).sort().map((date) => {
    const counts = byDate[date];
    const total = counts.present + counts.absent + counts.tardy + counts.excused;
    return {
      date,
      presentCount: counts.present,
      absentCount: counts.absent,
      lateCount: counts.tardy,
      excusedCount: counts.excused,
      percentage: total ? round1(((counts.present + counts.tardy) / total) * 100) : 0,
    };
  });
}

async function getGradeDistribution(schoolId, termId, classId, subjectId) {
  const [term, school] = await Promise.all([getTerm(schoolId, termId), School.findById(schoolId)]);
  const gradingScale = school?.settings?.gradingScale?.length ? school.settings.gradingScale : DEFAULT_GRADING_SCALE;

  const filter = { school: schoolId, date: { $gte: term.startDate, $lte: term.endDate } };
  if (classId) filter.class = classId;
  if (subjectId) {
    const subject = await Subject.findById(subjectId);
    filter.subject = subject ? subject.name : '__none__';
  }

  const records = await Academic.find(filter);

  const distribution = {};
  for (const { grade } of gradingScale) distribution[grade] = 0;

  let total = 0;
  for (const record of records) {
    const letter = computeLetterGrade(record.score, record.maxScore, gradingScale);
    if (letter) {
      distribution[letter] = (distribution[letter] || 0) + 1;
      total += 1;
    }
  }

  return { ...distribution, total };
}

async function getFeeCollectionByClass(schoolId, termId) {
  await getTerm(schoolId, termId);

  const invoices = await FeeInvoice.find({ school: schoolId, term: termId, isDeleted: false })
    .populate({ path: 'student', select: 'class', populate: { path: 'class', select: 'name' } });

  const byClass = {};
  for (const invoice of invoices) {
    const klass = invoice.student?.class;
    const key = klass ? String(klass._id) : 'unassigned';
    if (!byClass[key]) {
      byClass[key] = {
        classId: klass ? klass._id : null,
        className: klass ? klass.name : 'Unassigned',
        totalDue: 0,
        totalPaid: 0,
      };
    }
    byClass[key].totalDue += invoice.amountDue;
    byClass[key].totalPaid += invoice.amountPaid;
  }

  const rows = Object.values(byClass).map((row) => ({
    ...row,
    outstanding: row.totalDue - row.totalPaid,
    collectionRate: row.totalDue ? round1((row.totalPaid / row.totalDue) * 100) : 0,
  }));

  const totals = rows.reduce((acc, row) => ({
    totalDue: acc.totalDue + row.totalDue,
    totalPaid: acc.totalPaid + row.totalPaid,
  }), { totalDue: 0, totalPaid: 0 });

  return {
    rows,
    summary: {
      totalDue: totals.totalDue,
      totalPaid: totals.totalPaid,
      outstanding: totals.totalDue - totals.totalPaid,
      collectionRate: totals.totalDue ? round1((totals.totalPaid / totals.totalDue) * 100) : 0,
    },
  };
}

async function getStudentAtRisk(schoolId, termId) {
  const term = await getTerm(schoolId, termId);

  const students = await Student.find({ school: schoolId, isActive: true })
    .populate('parents', 'firstName lastName phone')
    .populate({ path: 'class', select: 'name teacher', populate: { path: 'teacher', select: 'firstName lastName' } });

  const evaluated = await Promise.all(students.map(async (student) => {
    const [attendanceRecords, academicRecords] = await Promise.all([
      Attendance.find({ school: schoolId, student: student._id, date: { $gte: term.startDate, $lte: term.endDate } }),
      Academic.find({ school: schoolId, student: student._id, date: { $gte: term.startDate, $lte: term.endDate } }),
    ]);

    const attendancePercent = attendanceRecords.length
      ? round1((attendanceRecords.filter((a) => PRESENT_STATUSES.includes(a.status)).length / attendanceRecords.length) * 100)
      : null;
    const gradeAverage = academicRecords.length
      ? round1(academicRecords.reduce((sum, r) => sum + (r.score / r.maxScore) * 100, 0) / academicRecords.length)
      : null;

    return {
      student, attendancePercent, gradeAverage,
    };
  }));

  return evaluated
    .filter(({ attendancePercent, gradeAverage }) => (attendancePercent !== null && attendancePercent < 70)
      || (gradeAverage !== null && gradeAverage < 50))
    .map(({ student, attendancePercent, gradeAverage }) => ({
      student: {
        _id: student._id, firstName: student.firstName, lastName: student.lastName, class: student.class?._id || null,
      },
      attendancePercent,
      gradeAverage,
      parents: student.parents,
      classTeacher: student.class?.teacher || null,
    }));
}

module.exports = {
  getSchoolOverview,
  getAttendanceTrend,
  getGradeDistribution,
  getFeeCollectionByClass,
  getStudentAtRisk,
};
