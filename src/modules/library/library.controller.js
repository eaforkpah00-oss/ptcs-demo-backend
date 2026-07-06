const catchAsync = require('../../utils/catchAsync');
const ApiResponse = require('../../utils/apiResponse');
const libraryService = require('./library.service');

exports.addBook = catchAsync(async (req, res) => {
  const book = await libraryService.addBook(req.schoolId, req.body, req.user._id);
  return ApiResponse.success(res, book, 'Book added.', 201);
});

exports.getBooks = catchAsync(async (req, res) => {
  const { query, category, page, limit } = req.query;
  const result = await libraryService.searchBooks(req.schoolId, query, category, Number(page) || 1, Number(limit) || 20);
  return ApiResponse.success(res, result, 'Books retrieved.');
});

exports.updateBook = catchAsync(async (req, res) => {
  const book = await libraryService.updateBook(req.schoolId, req.params.id, req.body, req.user._id);
  return ApiResponse.success(res, book, 'Book updated.');
});

exports.deleteBook = catchAsync(async (req, res) => {
  const book = await libraryService.deleteBook(req.schoolId, req.params.id, req.user._id);
  return ApiResponse.success(res, book, 'Book deleted.');
});

exports.borrowBook = catchAsync(async (req, res) => {
  const record = await libraryService.borrowBook(req.schoolId, req.body.book, req.body.student, req.user._id);
  return ApiResponse.success(res, record, 'Book borrowed.', 201);
});

exports.returnBook = catchAsync(async (req, res) => {
  const record = await libraryService.returnBook(req.schoolId, req.params.recordId, req.user._id, req.body.finePaid);
  return ApiResponse.success(res, record, 'Book returned.');
});

exports.getStudentHistory = catchAsync(async (req, res) => {
  const history = await libraryService.getStudentBorrowHistory(
    req.schoolId, req.params.studentId, req.user._id, req.user.role,
  );
  return ApiResponse.success(res, history, 'Borrow history retrieved.');
});

exports.getOverdueList = catchAsync(async (req, res) => {
  const list = await libraryService.getOverdueList(req.schoolId);
  return ApiResponse.success(res, list, 'Overdue list retrieved.');
});
