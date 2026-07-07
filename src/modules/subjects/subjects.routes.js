const express = require('express');
const { protect, restrictTo } = require('../../middleware/auth');
const { attachTenant } = require('../../middleware/tenant');
const { validate } = require('../../middleware/validate');
const subjectsValidation = require('./subjects.validation');
const subjectsController = require('./subjects.controller');

const router = express.Router();

router.use(protect, attachTenant);

router.get('/', subjectsController.getSubjects);
router.post('/', restrictTo('school_admin'), validate(subjectsValidation.createSubject), subjectsController.createSubject);

module.exports = router;
