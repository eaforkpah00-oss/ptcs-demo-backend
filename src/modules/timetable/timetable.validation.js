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

const getTimetable = z.object({
  class: objectId,
  term: objectId,
});

const getTeacherTimetable = z.object({
  teacher: objectId,
  term: objectId,
});

module.exports = {
  createPeriod,
  updatePeriod,
  getTimetable,
  getTeacherTimetable,
};
