const express = require('express');
const { protect, restrictTo } = require('../../middleware/auth');
const { attachTenant } = require('../../middleware/tenant');
const { validate, validateQuery } = require('../../middleware/validate');
const libraryValidation = require('./library.validation');
const libraryController = require('./library.controller');

const router = express.Router();

router.use(protect, attachTenant);

router.post(
  '/books',
  restrictTo('school_admin'),
  validate(libraryValidation.addBook),
  libraryController.addBook,
);
router.get(
  '/books',
  restrictTo('school_admin', 'teacher', 'parent'),
  validateQuery(libraryValidation.searchBooks),
  libraryController.getBooks,
);
router.put(
  '/books/:id',
  restrictTo('school_admin'),
  validate(libraryValidation.updateBook),
  libraryController.updateBook,
);
router.delete('/books/:id', restrictTo('school_admin'), libraryController.deleteBook);

router.post(
  '/borrow',
  restrictTo('school_admin'),
  validate(libraryValidation.borrowBook),
  libraryController.borrowBook,
);
router.post(
  '/return/:recordId',
  restrictTo('school_admin'),
  validate(libraryValidation.returnBook),
  libraryController.returnBook,
);
router.get(
  '/student/:studentId/history',
  restrictTo('school_admin', 'parent'),
  libraryController.getStudentHistory,
);
router.get('/overdue', restrictTo('school_admin'), libraryController.getOverdueList);
router.get('/borrowed', restrictTo('school_admin'), libraryController.getBorrowedList);

module.exports = router;
