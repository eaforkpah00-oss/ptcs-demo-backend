const express = require('express');
const { protect, restrictTo } = require('../../middleware/auth');
const { attachTenant } = require('../../middleware/tenant');
const { validate } = require('../../middleware/validate');
const termsValidation = require('./terms.validation');
const termsController = require('./terms.controller');

const router = express.Router();

router.use(protect, attachTenant);

router.get('/', termsController.getTerms);
router.post('/', restrictTo('school_admin'), validate(termsValidation.createTerm), termsController.createTerm);
router.patch('/:id/set-current', restrictTo('school_admin'), termsController.setCurrentTerm);

module.exports = router;
