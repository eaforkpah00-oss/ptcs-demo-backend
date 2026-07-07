const AcademicTerm = require('../../models/AcademicTerm');
const AuditLog = require('../../models/AuditLog');
const AppError = require('../../utils/appError');

async function getTerms(schoolId) {
  return AcademicTerm.find({ school: schoolId }).sort('-startDate');
}

async function createTerm(schoolId, data, adminId) {
  const term = await AcademicTerm.create({
    school: schoolId,
    name: data.name,
    academicYear: data.academicYear,
    startDate: data.startDate,
    endDate: data.endDate,
    isCurrent: !!data.isCurrent,
  });

  await AuditLog.record({
    school: schoolId, user: adminId, action: 'term.create',
    targetId: term._id, targetType: 'AcademicTerm',
  });

  return term;
}

async function setCurrentTerm(schoolId, termId, adminId) {
  const term = await AcademicTerm.findOne({ _id: termId, school: schoolId });
  if (!term) throw new AppError('Academic term not found.', 404);

  term.isCurrent = true;
  await term.save();

  await AuditLog.record({
    school: schoolId, user: adminId, action: 'term.set_current',
    targetId: term._id, targetType: 'AcademicTerm',
  });

  return term;
}

module.exports = {
  getTerms,
  createTerm,
  setCurrentTerm,
};
