const { z } = require('zod');

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');

const getAttendanceTrend = z.object({
  classId: objectId.optional(),
  weeks: z.coerce.number().int().positive().max(52).optional(),
});

const getGradeDistribution = z.object({
  termId: objectId,
  classId: objectId.optional(),
  subjectId: objectId.optional(),
});

const getStudentAtRisk = z.object({
  termId: objectId,
});

module.exports = {
  getAttendanceTrend,
  getGradeDistribution,
  getStudentAtRisk,
};
