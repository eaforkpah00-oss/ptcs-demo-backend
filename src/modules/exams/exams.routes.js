const express = require('express');
const { protect, restrictTo } = require('../../middleware/auth');
const { attachTenant } = require('../../middleware/tenant');
const { validate } = require('../../middleware/validate');
const examsValidation = require('./exams.validation');
const examsController = require('./exams.controller');

const router = express.Router();

router.use(protect, attachTenant);

router.post(
  '/',
  restrictTo('school_admin'),
  validate(examsValidation.scheduleExam),
  examsController.scheduleExam,
);
router.get(
  '/schedule/:termId',
  restrictTo('school_admin', 'teacher', 'parent'),
  examsController.getExamSchedule,
);

router.post(
  '/:examId/results',
  restrictTo('teacher', 'school_admin'),
  validate(examsValidation.submitResults),
  examsController.submitExamResults,
);
router.get('/:examId/results', restrictTo('teacher', 'school_admin'), examsController.getExamResults);

router.put(
  '/:examId',
  restrictTo('school_admin'),
  validate(examsValidation.updateExam),
  examsController.updateExam,
);
router.delete('/:examId', restrictTo('school_admin'), examsController.cancelExam);

module.exports = router;
