const { z } = require('zod');

const createSubject = z.object({
  name: z.string().min(1),
  code: z.string().optional().nullable(),
});

module.exports = {
  createSubject,
};
