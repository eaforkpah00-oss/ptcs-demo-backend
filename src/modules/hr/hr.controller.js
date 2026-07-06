const catchAsync = require('../../utils/catchAsync');
const ApiResponse = require('../../utils/apiResponse');
const hrService = require('./hr.service');

exports.createStaffProfile = catchAsync(async (req, res) => {
  const profile = await hrService.createStaffProfile(req.schoolId, req.body, req.user._id);
  return ApiResponse.success(res, profile, 'Staff profile created.', 201);
});

exports.getAllStaffProfiles = catchAsync(async (req, res) => {
  const profiles = await hrService.getAllStaffProfiles(req.schoolId);
  return ApiResponse.success(res, profiles, 'Staff profiles retrieved.');
});

exports.getStaffProfile = catchAsync(async (req, res) => {
  const profile = await hrService.getStaffProfile(req.schoolId, req.params.userId, req.user._id, req.user.role);
  return ApiResponse.success(res, profile, 'Staff profile retrieved.');
});

exports.updateStaffProfile = catchAsync(async (req, res) => {
  const profile = await hrService.updateStaffProfile(req.schoolId, req.params.userId, req.body, req.user._id);
  return ApiResponse.success(res, profile, 'Staff profile updated.');
});

exports.submitLeaveRequest = catchAsync(async (req, res) => {
  const request = await hrService.submitLeaveRequest(req.schoolId, req.user._id, req.body);
  return ApiResponse.success(res, request, 'Leave request submitted.', 201);
});

exports.getAllLeaveRequests = catchAsync(async (req, res) => {
  const requests = await hrService.getAllLeaveRequests(req.schoolId);
  return ApiResponse.success(res, requests, 'Leave requests retrieved.');
});

exports.getMyLeaveRequests = catchAsync(async (req, res) => {
  const requests = await hrService.getMyLeaveRequests(req.schoolId, req.user._id);
  return ApiResponse.success(res, requests, 'Leave requests retrieved.');
});

exports.reviewLeaveRequest = catchAsync(async (req, res) => {
  const request = await hrService.reviewLeaveRequest(
    req.schoolId, req.params.requestId, req.body.status, req.body.reviewNote, req.user._id,
  );
  return ApiResponse.success(res, request, 'Leave request reviewed.');
});

exports.getPayrollSummary = catchAsync(async (req, res) => {
  const summary = await hrService.getPayrollSummary(req.schoolId, Number(req.query.month), Number(req.query.year));
  return ApiResponse.success(res, summary, 'Payroll summary retrieved.');
});
