const express = require('express');
const { protect, restrictTo } = require('../../middleware/auth');
const { attachTenant } = require('../../middleware/tenant');
const { validate, validateQuery } = require('../../middleware/validate');
const calendarValidation = require('./calendar.validation');
const calendarController = require('./calendar.controller');

const router = express.Router();

router.use(protect, attachTenant);

router.post(
  '/events',
  restrictTo('school_admin'),
  validate(calendarValidation.createEvent),
  calendarController.createEvent,
);
router.get(
  '/events',
  restrictTo('school_admin', 'teacher', 'parent'),
  validateQuery(calendarValidation.getEvents),
  calendarController.getEvents,
);
router.get(
  '/events/upcoming',
  restrictTo('school_admin', 'teacher', 'parent'),
  calendarController.getUpcomingEvents,
);
router.put(
  '/events/:id',
  restrictTo('school_admin'),
  validate(calendarValidation.updateEvent),
  calendarController.updateEvent,
);
router.delete('/events/:id', restrictTo('school_admin'), calendarController.deleteEvent);

module.exports = router;
