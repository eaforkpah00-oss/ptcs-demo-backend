const { z } = require('zod');

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');
const dayOfWeek = z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday']);
const timeString = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Expected HH:mm');

const createPeriod = z.object({
  class: objectId,
  term: objectId,
  dayOfWeek,
  periodNumber: z.number().int().min(1).max(10),
  startTime: timeString,
  endTime: timeString,
  subject: objectId,
  teacher: objectId,
  room: z.string().optional().nullable(),
});

const updatePeriod = z.object({
  class: objectId.optional(),
  term: objectId.optional(),
  dayOfWeek: dayOfWeek.optional(),
  periodNumber: z.number().int().min(1).max(10).optional(),
  startTime: timeString.optional(),
  endTime: timeString.optional(),
  subject: objectId.optional(),
  teacher: objectId.optional(),
  room: z.string().optional().nullable(),
});

// class/teacher come from the route's :classId/:teacherId path params, not the
// query string — only `term` is ever actually read from req.query by the controller.
const termQuery = z.object({
  term: objectId,
});

const getTimetable = termQuery;
const getTeacherTimetable = termQuery;

module.exports = {
  createPeriod,
  updatePeriod,
  getTimetable,
  getTeacherTimetable,
};
