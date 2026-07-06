const express = require('express');
const { protect, restrictTo } = require('../../middleware/auth');
const { attachTenant } = require('../../middleware/tenant');
const { validate, validateQuery } = require('../../middleware/validate');
const hrValidation = require('./hr.validation');
const hrController = require('./hr.controller');

const router = express.Router();

router.use(protect, attachTenant);

router.post(
  '/profiles',
  restrictTo('school_admin'),
  validate(hrValidation.createStaffProfile),
  hrController.createStaffProfile,
);
router.get('/profiles', restrictTo('school_admin'), hrController.getAllStaffProfiles);
router.get('/profiles/:userId', restrictTo('school_admin', 'teacher'), hrController.getStaffProfile);
router.put(
  '/profiles/:userId',
  restrictTo('school_admin'),
  validate(hrValidation.updateStaffProfile),
  hrController.updateStaffProfile,
);

router.post(
  '/leave/request',
  restrictTo('teacher', 'school_admin'),
  validate(hrValidation.submitLeaveRequest),
  hrController.submitLeaveRequest,
);
router.get('/leave/requests', restrictTo('school_admin'), hrController.getAllLeaveRequests);
router.get('/leave/my-requests', restrictTo('teacher'), hrController.getMyLeaveRequests);
router.patch(
  '/leave/:requestId/review',
  restrictTo('school_admin'),
  validate(hrValidation.reviewLeaveRequest),
  hrController.reviewLeaveRequest,
);

router.get(
  '/payroll/summary',
  restrictTo('school_admin'),
  validateQuery(hrValidation.getPayrollSummary),
  hrController.getPayrollSummary,
);

module.exports = router;
