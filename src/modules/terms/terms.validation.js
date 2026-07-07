const { z } = require('zod');

const createTerm = z.object({
  name: z.string().min(1),
  academicYear: z.string().min(1),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  isCurrent: z.boolean().optional(),
});

module.exports = {
  createTerm,
};
