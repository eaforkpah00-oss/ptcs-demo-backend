const AppError = require('../utils/appError');

// Runs after `protect`. Every SMS-module route must apply this so services
// can filter strictly by req.schoolId instead of re-deriving it from req.user each time.
exports.attachTenant = (req, res, next) => {
  const schoolId = req.user?.school?._id || req.user?.school;
  if (!schoolId) {
    return next(new AppError('No school associated with this account.', 400));
  }
  req.schoolId = schoolId.toString();
  next();
};
