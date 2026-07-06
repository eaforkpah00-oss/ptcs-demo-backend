const express = require('express');
const { protect, restrictTo } = require('../../middleware/auth');
const { attachTenant } = require('../../middleware/tenant');
const { validate, validateQuery } = require('../../middleware/validate');
const timetableValidation = require('./timetable.validation');
const timetableController = require('./timetable.controller');

const router = express.Router();

router.use(protect, attachTenant);

router.post(
  '/periods',
  restrictTo('school_admin'),
  validate(timetableValidation.createPeriod),
  timetableController.createPeriod,
);
router.put(
  '/periods/:id',
  restrictTo('school_admin'),
  validate(timetableValidation.updatePeriod),
  timetableController.updatePeriod,
);
router.delete('/periods/:id', restrictTo('school_admin'), timetableController.deletePeriod);

router.get(
  '/class/:classId',
  restrictTo('school_admin', 'teacher', 'parent'),
  validateQuery(timetableValidation.getTimetable),
  timetableController.getClassTimetable,
);
router.get(
  '/teacher/:teacherId',
  restrictTo('school_admin', 'teacher'),
  validateQuery(timetableValidation.getTeacherTimetable),
  timetableController.getTeacherTimetable,
);
router.get('/conflicts/:termId', restrictTo('school_admin'), timetableController.detectConflicts);

module.exports = router;
