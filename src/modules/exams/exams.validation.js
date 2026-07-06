const { z } = require('zod');

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');
const timeString = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Expected HH:mm');

const scheduleExam = z.object({
  term: objectId,
  class: objectId.optional().nullable(),
  subject: objectId,
  title: z.string().min(1),
  examDate: z.coerce.date(),
  startTime: timeString,
  durationMins: z.number().int().positive(),
  venue: z.string().optional().nullable(),
  totalMarks: z.number().positive(),
  instructions: z.string().optional().nullable(),
});

const submitResults = z.object({
  grades: z.array(z.object({
    student: objectId,
    score: z.number().min(0),
    remarks: z.string().optional().nullable(),
  })).min(1),
});

const updateExam = z.object({
  term: objectId.optional(),
  class: objectId.optional().nullable(),
  subject: objectId.optional(),
  title: z.string().min(1).optional(),
  examDate: z.coerce.date().optional(),
  startTime: timeString.optional(),
  durationMins: z.number().int().positive().optional(),
  venue: z.string().optional().nullable(),
  totalMarks: z.number().positive().optional(),
  instructions: z.string().optional().nullable(),
});

// term comes from the route's :termId path param, not the query string —
// only `class` is ever actually read from req.query by the controller.
const getExamSchedule = z.object({
  class: objectId.optional(),
});

module.exports = {
  scheduleExam,
  submitResults,
  updateExam,
  getExamSchedule,
};
