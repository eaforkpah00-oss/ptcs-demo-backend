const { z } = require('zod');

const NOTIFICATION_CHANNELS = ['inApp', 'email', 'sms', 'whatsapp', 'push'];

// .strict() rejects any field besides phone/notificationPreferences with a 400,
// satisfying "throw ForbiddenError if any other fields are in data" via the
// same shared validate() middleware every other module already uses for input errors.
const updateProfile = z.object({
  phone: z.string().optional(),
  notificationPreferences: z.object({
    channels: z.array(z.enum(NOTIFICATION_CHANNELS)).optional(),
  }).optional(),
}).strict();

module.exports = {
  updateProfile,
};
