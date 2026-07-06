const { z } = require('zod');

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');
const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Expected a hex color like #3B82F6');
const EVENT_TYPES = ['holiday', 'exam', 'sports', 'meeting', 'cultural', 'other'];

const createEvent = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  eventType: z.enum(EVENT_TYPES),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
  allDay: z.boolean().optional(),
  affectsClasses: z.array(objectId).optional(),
  color: hexColor.optional(),
});

const updateEvent = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  eventType: z.enum(EVENT_TYPES).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  allDay: z.boolean().optional(),
  affectsClasses: z.array(objectId).optional(),
  color: hexColor.optional(),
});

const getEvents = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  classId: objectId.optional(),
});

module.exports = {
  createEvent,
  updateEvent,
  getEvents,
};
