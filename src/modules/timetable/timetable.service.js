const Timetable = require('../../models/Timetable');
const AuditLog = require('../../models/AuditLog');
const AppError = require('../../utils/appError');

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

async function checkConflicts(schoolId, data, excludePeriodId = null) {
  const baseFilter = {
    school: schoolId,
    term: data.term,
    dayOfWeek: data.dayOfWeek,
    periodNumber: data.periodNumber,
    isDeleted: false,
  };
  if (excludePeriodId) baseFilter._id = { $ne: excludePeriodId };

  const teacherConflict = await Timetable.findOne({ ...baseFilter, teacher: data.teacher });
  if (teacherConflict) throw new AppError('Teacher already has a class at this time.', 409);

  const classConflict = await Timetable.findOne({ ...baseFilter, class: data.class });
  if (classConflict) throw new AppError('This class already has a subject at this time.', 409);

  if (data.room) {
    const roomConflict = await Timetable.findOne({ ...baseFilter, room: data.room });
    if (roomConflict) throw new AppError('This room is already booked at this time.', 409);
  }
}

async function createPeriod(schoolId, data, adminId) {
  await checkConflicts(schoolId, data);

  const period = await Timetable.create({
    school: schoolId,
    class: data.class,
    term: data.term,
    dayOfWeek: data.dayOfWeek,
    periodNumber: data.periodNumber,
    startTime: data.startTime,
    endTime: data.endTime,
    subject: data.subject,
    teacher: data.teacher,
    room: data.room || null,
    createdBy: adminId,
  });

  await AuditLog.record({
    school: schoolId, user: adminId, action: 'timetable.period.create',
    targetId: period._id, targetType: 'Timetable',
  });

  return period;
}

async function updatePeriod(schoolId, periodId, data, adminId) {
  const period = await Timetable.findOne({ _id: periodId, school: schoolId, isDeleted: false });
  if (!period) throw new AppError('Timetable period not found.', 404);

  const conflictFields = ['class', 'term', 'dayOfWeek', 'periodNumber', 'teacher', 'room'];
  if (conflictFields.some((field) => field in data)) {
    await checkConflicts(schoolId, {
      class: data.class ?? period.class,
      term: data.term ?? period.term,
      dayOfWeek: data.dayOfWeek ?? period.dayOfWeek,
      periodNumber: data.periodNumber ?? period.periodNumber,
      teacher: data.teacher ?? period.teacher,
      room: data.room ?? period.room,
    }, period._id);
  }

  Object.assign(period, data, { updatedBy: adminId });
  await period.save();

  await AuditLog.record({
    school: schoolId, user: adminId, action: 'timetable.period.update',
    targetId: period._id, targetType: 'Timetable',
  });

  return period;
}

async function deletePeriod(schoolId, periodId, adminId) {
  const period = await Timetable.findOneAndUpdate(
    { _id: periodId, school: schoolId, isDeleted: false },
    { isDeleted: true, deletedAt: new Date(), updatedBy: adminId },
    { new: true },
  );
  if (!period) throw new AppError('Timetable period not found.', 404);

  await AuditLog.record({
    school: schoolId, user: adminId, action: 'timetable.period.delete',
    targetId: period._id, targetType: 'Timetable',
  });

  return period;
}

function groupByDay(periods) {
  const grouped = { monday: [], tuesday: [], wednesday: [], thursday: [], friday: [] };
  for (const period of periods) {
    grouped[period.dayOfWeek].push(period);
  }
  for (const day of DAYS) {
    grouped[day].sort((a, b) => a.periodNumber - b.periodNumber);
  }
  return grouped;
}

async function getClassTimetable(schoolId, classId, termId) {
  const periods = await Timetable.find({ school: schoolId, class: classId, term: termId, isDeleted: false })
    .populate('subject', 'name code')
    .populate('teacher', 'firstName lastName');
  return groupByDay(periods);
}

async function getTeacherTimetable(schoolId, teacherId, termId) {
  const periods = await Timetable.find({ school: schoolId, teacher: teacherId, term: termId, isDeleted: false })
    .populate('class', 'name')
    .populate('subject', 'name');
  return groupByDay(periods);
}

async function detectConflicts(schoolId, termId) {
  const periods = await Timetable.find({ school: schoolId, term: termId, isDeleted: false });

  const byTeacher = {};
  const byRoom = {};
  for (const period of periods) {
    const teacherKey = `${period.teacher}|${period.dayOfWeek}|${period.periodNumber}`;
    (byTeacher[teacherKey] = byTeacher[teacherKey] || []).push(period);

    if (period.room) {
      const roomKey = `${period.room}|${period.dayOfWeek}|${period.periodNumber}`;
      (byRoom[roomKey] = byRoom[roomKey] || []).push(period);
    }
  }

  return {
    teacherConflicts: Object.values(byTeacher).filter((group) => group.length > 1),
    roomConflicts: Object.values(byRoom).filter((group) => group.length > 1),
  };
}

module.exports = {
  createPeriod,
  updatePeriod,
  deletePeriod,
  getClassTimetable,
  getTeacherTimetable,
  detectConflicts,
};
