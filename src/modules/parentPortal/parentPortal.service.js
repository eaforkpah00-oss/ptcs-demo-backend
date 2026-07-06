const Student = require('../../models/Student');
const User = require('../../models/User');
const AcademicTerm = require('../../models/AcademicTerm');
const Attendance = require('../../models/Attendance');
const Academic = require('../../models/Academic');
const Exam = require('../../models/Exam');
const Message = require('../../models/Message');
const BorrowRecord = require('../../models/BorrowRecord');
const FeeInvoice = require('../../models/FeeInvoice');
const School = require('../../models/School');
const AuditLog = require('../../models/AuditLog');
const AppError = require('../../utils/appError');
const feesService = require('../fees/fees.service');
const libraryService = require('../library/library.service');
const timetableService = require('../timetable/timetable.service');

const PRESENT_STATUSES = ['present', 'tardy'];
const DEFAULT_GRADING_SCALE = [
  { min: 80, max: 100, grade: 'A' },
  { min: 70, max: 79, grade: 'B' },
  { min: 60, max: 69, grade: 'C' },
  { min: 50, max: 59, grade: 'D' },
  { min: 0, max: 49, grade: 'F' },
];

function round1(value) {
  return Math.round(value * 10) / 10;
}

function attendanceSummary(records) {
  const total = records.length;
  const present = records.filter((r) => PRESENT_STATUSES.includes(r.status)).length;
  return { total, present, percentage: total ? round1((present / total) * 100) : 0 };
}

async function computeLetterGradeSummary(schoolId, records) {
  const school = await School.findById(schoolId);
  const gradingScale = school?.settings?.gradingScale?.length ? school.settings.gradingScale : DEFAULT_GRADING_SCALE;

  const average = records.length
    ? round1(records.reduce((sum, r) => sum + (r.score / r.maxScore) * 100, 0) / records.length)
    : null;
  const letter = average === null
    ? null
    : (gradingScale.find((g) => average >= g.min && average <= g.max)?.grade || null);

  return { records, average, letter };
}

async function getLinkedStudents(parentId, schoolId) {
  const parent = await User.findOne({ _id: parentId, school: schoolId, role: 'parent' });
  if (!parent) throw new AppError('Parent account not found for this school.', 404);
  return Student.find({ parents: parentId, school: schoolId, isActive: true }).populate('class', 'name');
}

async function verifyParentOwnsStudent(parentId, studentId, schoolId) {
  const student = await Student.findOne({ _id: studentId, school: schoolId });
  if (!student || !(student.parents || []).map(String).includes(String(parentId))) {
    throw new AppError('You are not authorized to access this student.', 403);
  }
  return student;
}

async function getChildDashboard(parentId, schoolId) {
  const students = await getLinkedStudents(parentId, schoolId);
  const currentTerm = await AcademicTerm.findOne({ school: schoolId, isCurrent: true });
  const unreadMessages = await Message.countDocuments({ recipient: parentId, isRead: false });

  const weekStart = new Date();
  weekStart.setUTCHours(0, 0, 0, 0);
  weekStart.setUTCDate(weekStart.getUTCDate() - 7);
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  return Promise.all(students.map(async (student) => {
    const [
      attendanceThisWeek, termAttendance, latestGrades, feeInvoices, borrowedBooks, upcomingExams,
    ] = await Promise.all([
      Attendance.find({ school: schoolId, student: student._id, date: { $gte: weekStart } }),
      currentTerm
        ? Attendance.find({
          school: schoolId, student: student._id, date: { $gte: currentTerm.startDate, $lte: currentTerm.endDate },
        })
        : [],
      Academic.find({ school: schoolId, student: student._id }).sort('-date').limit(3),
      currentTerm
        ? FeeInvoice.find({ school: schoolId, student: student._id, term: currentTerm._id, isDeleted: false })
        : [],
      BorrowRecord.find({ school: schoolId, student: student._id, status: 'borrowed', isDeleted: false }).populate('book', 'title author'),
      Exam.find({
        school: schoolId,
        isDeleted: false,
        status: { $in: ['scheduled', 'ongoing'] },
        examDate: { $gte: todayStart },
        $or: [{ class: student.class?._id || student.class }, { class: null }],
      }).sort('examDate').limit(2),
    ]);

    const feeBalance = feeInvoices.reduce((sum, inv) => sum + (inv.amountDue - inv.amountPaid), 0);

    return {
      student,
      currentTerm,
      attendanceThisWeek,
      attendancePercent: attendanceSummary(termAttendance).percentage,
      latestGrades,
      feeBalance,
      borrowedBooks,
      upcomingExams,
      unreadMessages,
    };
  }));
}

async function getChildFullReport(parentId, studentId, termId, schoolId) {
  await verifyParentOwnsStudent(parentId, studentId, schoolId);

  const term = await AcademicTerm.findOne({ _id: termId, school: schoolId });
  if (!term) throw new AppError('Academic term not found.', 404);

  const [academicRecords, attendanceRecords, borrowHistory, feeStatement] = await Promise.all([
    Academic.find({ school: schoolId, student: studentId, date: { $gte: term.startDate, $lte: term.endDate } }),
    Attendance.find({ school: schoolId, student: studentId, date: { $gte: term.startDate, $lte: term.endDate } }),
    BorrowRecord.find({
      school: schoolId, student: studentId, isDeleted: false, borrowedAt: { $gte: term.startDate, $lte: term.endDate },
    }).populate('book', 'title author'),
    feesService.getStudentFeeStatement(schoolId, studentId, termId, parentId, 'parent'),
  ]);

  const gradeReport = await computeLetterGradeSummary(schoolId, academicRecords);

  return {
    term,
    grades: gradeReport,
    attendance: attendanceSummary(attendanceRecords),
    borrowHistory,
    fees: feeStatement,
  };
}

async function getChildAttendance(parentId, studentId, schoolId, { startDate, endDate, page = 1, limit = 30 } = {}) {
  await verifyParentOwnsStudent(parentId, studentId, schoolId);

  const filter = { school: schoolId, student: studentId };
  if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.$gte = new Date(startDate);
    if (endDate) filter.date.$lte = new Date(endDate);
  }

  const skip = (page - 1) * limit;
  const [records, total] = await Promise.all([
    Attendance.find(filter).populate('class', 'name').sort('-date').skip(skip).limit(limit),
    Attendance.countDocuments(filter),
  ]);

  return { records, total, ...attendanceSummary(await Attendance.find(filter)) };
}

async function getChildClassTimetable(parentId, classId, schoolId, termId) {
  const hasChildInClass = await Student.exists({
    parents: parentId, school: schoolId, class: classId, isActive: true,
  });
  if (!hasChildInClass) throw new AppError('You are not authorized to view this class.', 403);

  return timetableService.getClassTimetable(schoolId, classId, termId);
}

async function getChildFeeStatement(parentId, studentId, termId, schoolId) {
  return feesService.getStudentFeeStatement(schoolId, studentId, termId, parentId, 'parent');
}

async function initiateChildFeePayment(parentId, invoiceId, schoolId) {
  return feesService.initializePaystackPayment(schoolId, invoiceId, parentId);
}

async function getChildBorrowHistory(parentId, studentId, schoolId) {
  return libraryService.getStudentBorrowHistory(schoolId, studentId, parentId, 'parent');
}

const UPDATABLE_PROFILE_FIELDS = ['phone', 'notificationPreferences'];

async function updateOwnProfile(parentId, schoolId, data) {
  const disallowed = Object.keys(data).filter((key) => !UPDATABLE_PROFILE_FIELDS.includes(key));
  if (disallowed.length) {
    throw new AppError(`Only phone and notificationPreferences may be updated (rejected: ${disallowed.join(', ')}).`, 403);
  }

  const user = await User.findOne({ _id: parentId, school: schoolId, role: 'parent' });
  if (!user) throw new AppError('Parent account not found for this school.', 404);

  if ('phone' in data) user.phone = data.phone;
  if ('notificationPreferences' in data) {
    user.notificationPreferences = {
      ...user.notificationPreferences,
      ...data.notificationPreferences,
    };
  }
  await user.save();

  await AuditLog.record({
    school: schoolId, user: parentId, action: 'parent.profile.update', targetId: user._id, targetType: 'User',
  });

  return user;
}

module.exports = {
  getLinkedStudents,
  verifyParentOwnsStudent,
  getChildDashboard,
  getChildFullReport,
  getChildAttendance,
  getChildClassTimetable,
  getChildFeeStatement,
  initiateChildFeePayment,
  getChildBorrowHistory,
  updateOwnProfile,
};
