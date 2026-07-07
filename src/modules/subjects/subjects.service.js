const Subject = require('../../models/Subject');
const AuditLog = require('../../models/AuditLog');
const AppError = require('../../utils/appError');

async function getSubjects(schoolId) {
  return Subject.find({ school: schoolId, isActive: true }).sort('name');
}

async function createSubject(schoolId, data, adminId) {
  const existing = await Subject.findOne({ school: schoolId, name: data.name });
  if (existing) throw new AppError('A subject with this name already exists.', 409);

  const subject = await Subject.create({
    school: schoolId,
    name: data.name,
    code: data.code || null,
  });

  await AuditLog.record({
    school: schoolId, user: adminId, action: 'subject.create',
    targetId: subject._id, targetType: 'Subject',
  });

  return subject;
}

module.exports = {
  getSubjects,
  createSubject,
};
