const AppError = require('../utils/appError');

const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const message = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('. ');
    return next(new AppError(`Invalid input: ${message}`, 400));
  }
  req.body = result.data;
  next();
};

const validateQuery = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.query);
  if (!result.success) {
    const message = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('. ');
    return next(new AppError(`Invalid query: ${message}`, 400));
  }
  req.query = result.data;
  next();
};

module.exports = { validate, validateQuery };
