const express = require('express');
const { protect, restrictTo } = require('../../middleware/auth');
const { attachTenant } = require('../../middleware/tenant');
const { validate } = require('../../middleware/validate');
const feesValidation = require('./fees.validation');
const feesController = require('./fees.controller');

const router = express.Router();

// Paystack calls this directly — it verifies the signature itself, no auth middleware.
router.post('/webhooks/paystack', feesController.handlePaystackWebhook);

router.use(protect, attachTenant);

router.post(
  '/structures',
  restrictTo('school_admin'),
  validate(feesValidation.createFeeStructure),
  feesController.createFeeStructure,
);
router.get('/structures', restrictTo('school_admin', 'teacher'), feesController.getFeeStructures);
router.put(
  '/structures/:id',
  restrictTo('school_admin'),
  validate(feesValidation.updateFeeStructure),
  feesController.updateFeeStructure,
);
router.delete('/structures/:id', restrictTo('school_admin'), feesController.deleteFeeStructure);

router.post(
  '/generate-invoices',
  restrictTo('school_admin'),
  validate(feesValidation.generateInvoices),
  feesController.generateInvoices,
);
router.get('/invoices', restrictTo('school_admin'), feesController.getFeeInvoices);
router.get(
  '/invoices/student/:studentId',
  restrictTo('school_admin', 'parent'),
  feesController.getStudentFeeStatement,
);

router.post(
  '/payments',
  restrictTo('school_admin'),
  validate(feesValidation.recordPayment),
  feesController.recordPayment,
);
router.post('/pay/initialize/:invoiceId', restrictTo('parent'), feesController.initializePaystackPayment);

router.get('/report/:termId', restrictTo('school_admin'), feesController.getSchoolFeeReport);

module.exports = router;
