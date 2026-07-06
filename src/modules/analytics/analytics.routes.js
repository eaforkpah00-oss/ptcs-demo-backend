const express = require('express');
const { protect, restrictTo } = require('../../middleware/auth');
const { attachTenant } = require('../../middleware/tenant');
const { validateQuery } = require('../../middleware/validate');
const analyticsValidation = require('./analytics.validation');
const analyticsController = require('./analytics.controller');

const router = express.Router();

router.use(protect, attachTenant);

router.get('/overview/:termId', restrictTo('school_admin'), analyticsController.getSchoolOverview);
router.get(
  '/attendance/trend',
  restrictTo('school_admin', 'teacher'),
  validateQuery(analyticsValidation.getAttendanceTrend),
  analyticsController.getAttendanceTrend,
);
router.get(
  '/grades/distribution',
  restrictTo('school_admin', 'teacher'),
  validateQuery(analyticsValidation.getGradeDistribution),
  analyticsController.getGradeDistribution,
);
router.get('/fees/by-class/:termId', restrictTo('school_admin'), analyticsController.getFeeCollectionByClass);
router.get(
  '/students/at-risk',
  restrictTo('school_admin'),
  validateQuery(analyticsValidation.getStudentAtRisk),
  analyticsController.getStudentAtRisk,
);

module.exports = router;
