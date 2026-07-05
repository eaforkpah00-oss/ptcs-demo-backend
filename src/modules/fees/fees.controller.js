const catchAsync = require('../../utils/catchAsync');
const ApiResponse = require('../../utils/apiResponse');
const feesService = require('./fees.service');

exports.createFeeStructure = catchAsync(async (req, res) => {
  const structure = await feesService.createFeeStructure(req.schoolId, req.body, req.user._id);
  return ApiResponse.success(res, structure, 'Fee structure created.', 201);
});

exports.getFeeStructures = catchAsync(async (req, res) => {
  const result = await feesService.getFeeStructures(req.schoolId, req.query);
  return ApiResponse.success(res, result, 'Fee structures retrieved.');
});

exports.updateFeeStructure = catchAsync(async (req, res) => {
  const structure = await feesService.updateFeeStructure(req.schoolId, req.params.id, req.body, req.user._id);
  return ApiResponse.success(res, structure, 'Fee structure updated.');
});

exports.deleteFeeStructure = catchAsync(async (req, res) => {
  await feesService.deleteFeeStructure(req.schoolId, req.params.id, req.user._id);
  return ApiResponse.success(res, null, 'Fee structure deleted.');
});

exports.generateInvoices = catchAsync(async (req, res) => {
  const result = await feesService.generateInvoices(req.schoolId, req.body.term, req.user._id);
  return ApiResponse.success(res, result, 'Invoices generated.');
});

exports.getFeeInvoices = catchAsync(async (req, res) => {
  const result = await feesService.getFeeInvoices(req.schoolId, req.query);
  return ApiResponse.success(res, result, 'Invoices retrieved.');
});

exports.getStudentFeeStatement = catchAsync(async (req, res) => {
  const statement = await feesService.getStudentFeeStatement(
    req.schoolId, req.params.studentId, req.query.term, req.user._id, req.user.role,
  );
  return ApiResponse.success(res, statement, 'Fee statement retrieved.');
});

exports.recordPayment = catchAsync(async (req, res) => {
  const result = await feesService.recordPayment(req.schoolId, req.body.invoice, req.body, req.user._id);
  return ApiResponse.success(res, result, 'Payment recorded.', 201);
});

exports.initializePaystackPayment = catchAsync(async (req, res) => {
  const result = await feesService.initializePaystackPayment(req.schoolId, req.params.invoiceId, req.user._id);
  return ApiResponse.success(res, result, 'Payment initialized.');
});

exports.handlePaystackWebhook = catchAsync(async (req, res) => {
  await feesService.handlePaystackFeeWebhook(req.body, req.headers['x-paystack-signature']);
  res.status(200).json({ status: 'success' });
});

exports.getSchoolFeeReport = catchAsync(async (req, res) => {
  const report = await feesService.getSchoolFeeReport(req.schoolId, req.params.termId);
  return ApiResponse.success(res, report, 'Fee report retrieved.');
});
