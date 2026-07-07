const catchAsync = require('../../utils/catchAsync');
const ApiResponse = require('../../utils/apiResponse');
const termsService = require('./terms.service');

exports.getTerms = catchAsync(async (req, res) => {
  const terms = await termsService.getTerms(req.schoolId);
  return ApiResponse.success(res, terms, 'Academic terms retrieved.');
});

exports.createTerm = catchAsync(async (req, res) => {
  const term = await termsService.createTerm(req.schoolId, req.body, req.user._id);
  return ApiResponse.success(res, term, 'Academic term created.', 201);
});

exports.setCurrentTerm = catchAsync(async (req, res) => {
  const term = await termsService.setCurrentTerm(req.schoolId, req.params.id, req.user._id);
  return ApiResponse.success(res, term, 'Current term updated.');
});
