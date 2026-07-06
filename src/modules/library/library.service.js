const Book = require('../../models/Book');
const BorrowRecord = require('../../models/BorrowRecord');
const Student = require('../../models/Student');
const School = require('../../models/School');
const AuditLog = require('../../models/AuditLog');
const AppError = require('../../utils/appError');
const { sendNotification } = require('../../services/notification.service');

const MS_PER_DAY = 1000 * 60 * 60 * 24;

async function notifyParents(student, schoolId, title, body, data = {}) {
  await Promise.all((student.parents || []).map((parentId) => sendNotification(
    parentId, 'library_overdue', title, body, { schoolId, ...data }, ['inApp'],
  )));
}

async function addBook(schoolId, data, adminId) {
  const book = await Book.create({
    school: schoolId,
    title: data.title,
    author: data.author || null,
    isbn: data.isbn || null,
    category: data.category || 'General',
    totalCopies: data.totalCopies,
    availableCopies: data.totalCopies,
    publishedYear: data.publishedYear || null,
    createdBy: adminId,
  });

  await AuditLog.record({
    school: schoolId, user: adminId, action: 'library.book.add',
    targetId: book._id, targetType: 'Book',
  });

  return book;
}

async function updateBook(schoolId, bookId, data, adminId) {
  const book = await Book.findOne({ _id: bookId, school: schoolId, isDeleted: false });
  if (!book) throw new AppError('Book not found.', 404);

  if ('totalCopies' in data) {
    const delta = data.totalCopies - book.totalCopies;
    book.availableCopies = Math.max(0, book.availableCopies + delta);
  }
  Object.assign(book, data, { updatedBy: adminId });
  await book.save();

  await AuditLog.record({
    school: schoolId, user: adminId, action: 'library.book.update',
    targetId: book._id, targetType: 'Book',
  });

  return book;
}

async function deleteBook(schoolId, bookId, adminId) {
  const book = await Book.findOneAndUpdate(
    { _id: bookId, school: schoolId, isDeleted: false },
    { isDeleted: true, deletedAt: new Date(), updatedBy: adminId },
    { new: true },
  );
  if (!book) throw new AppError('Book not found.', 404);

  await AuditLog.record({
    school: schoolId, user: adminId, action: 'library.book.delete',
    targetId: book._id, targetType: 'Book',
  });

  return book;
}

async function borrowBook(schoolId, bookId, studentId, adminId) {
  const book = await Book.findOne({ _id: bookId, school: schoolId, isDeleted: false });
  if (!book) throw new AppError('Book not found.', 404);
  if (book.availableCopies < 1) throw new AppError('No copies available.', 409);

  const student = await Student.findOne({ _id: studentId, school: schoolId });
  if (!student) throw new AppError('Student not found.', 404);

  const hasOverdue = await BorrowRecord.findOne({
    school: schoolId, student: studentId, status: 'overdue', isDeleted: false,
  });
  if (hasOverdue) throw new AppError('Student has overdue books. Return them before borrowing.', 409);

  const school = await School.findById(schoolId);
  const loanPeriodDays = school?.settings?.loanPeriodDays ?? 14;
  const dueDate = new Date(Date.now() + loanPeriodDays * MS_PER_DAY);

  const record = await BorrowRecord.create({
    school: schoolId, book: bookId, student: studentId, dueDate, createdBy: adminId,
  });

  book.availableCopies -= 1;
  await book.save();

  if (!student.libraryCardNo) {
    student.libraryCardNo = `LIB${String(student._id).slice(-6).toUpperCase()}`;
    await student.save();
  }

  await notifyParents(
    student, schoolId, 'Book Borrowed',
    `${student.firstName} ${student.lastName} borrowed "${book.title}". Due by ${dueDate.toDateString()}.`,
    { bookId: book._id, borrowRecordId: record._id },
  );

  await AuditLog.record({
    school: schoolId, user: adminId, action: 'library.book.borrow',
    targetId: record._id, targetType: 'BorrowRecord',
  });

  return record;
}

async function returnBook(schoolId, borrowRecordId, adminId, finePaid) {
  const record = await BorrowRecord.findOne({ _id: borrowRecordId, school: schoolId, isDeleted: false })
    .populate('book')
    .populate('student');
  if (!record) throw new AppError('Borrow record not found.', 404);
  if (record.status === 'returned') throw new AppError('Book already returned.', 409);

  const now = new Date();
  let fine = 0;
  if (now > record.dueDate) {
    const daysOverdue = Math.ceil((now - record.dueDate) / MS_PER_DAY);
    const school = await School.findById(schoolId);
    const finePerDay = school?.settings?.finePerDayPesewas ?? 50;
    fine = daysOverdue * finePerDay;
  }

  record.status = 'returned';
  record.returnedAt = now;
  record.fine = fine;
  record.finePaid = finePaid || fine === 0;
  await record.save();

  await Book.updateOne({ _id: record.book._id }, { $inc: { availableCopies: 1 } });

  if (fine > 0) {
    await notifyParents(
      record.student, schoolId, 'Library Fine Due',
      `A fine of ${fine} pesewas is due for "${record.book.title}", returned late by ${record.student.firstName} ${record.student.lastName}.`,
      { bookId: record.book._id, borrowRecordId: record._id },
    );
  }

  await AuditLog.record({
    school: schoolId, user: adminId, action: 'library.book.return',
    targetId: record._id, targetType: 'BorrowRecord', metadata: { fine },
  });

  return record;
}

async function checkOverdueBooks(schoolId) {
  const now = new Date();
  const records = await BorrowRecord.find({
    school: schoolId, dueDate: { $lt: now }, status: 'borrowed', isDeleted: false,
  }).populate('book').populate('student');

  for (const record of records) {
    record.status = 'overdue';
    await record.save();

    await notifyParents(
      record.student, schoolId, 'Overdue Library Book',
      `${record.student.firstName} ${record.student.lastName}'s borrowed book "${record.book.title}" was due on ${record.dueDate.toDateString()} and has not been returned.`,
      { bookId: record.book._id, borrowRecordId: record._id },
    );
  }

  await AuditLog.record({
    school: schoolId, action: 'library.overdue.check', targetId: schoolId, targetType: 'School',
    metadata: { flagged: records.length },
  });

  return { flagged: records.length };
}

async function getStudentBorrowHistory(schoolId, studentId, requestingUserId, requestingRole) {
  if (requestingRole === 'parent') {
    const student = await Student.findOne({ _id: studentId, school: schoolId });
    if (!student || !student.parents.some((p) => String(p) === String(requestingUserId))) {
      throw new AppError('You are not authorized to view this student\'s library history.', 403);
    }
  }

  return BorrowRecord.find({ student: studentId, school: schoolId, isDeleted: false })
    .populate('book', 'title author coverImage')
    .sort('-borrowedAt');
}

async function searchBooks(schoolId, query, category, page = 1, limit = 20) {
  const filter = { school: schoolId, isDeleted: false };
  if (query) filter.$text = { $search: query };
  if (category) filter.category = category;

  const books = await Book.find(filter)
    .skip((page - 1) * limit)
    .limit(limit);
  const total = await Book.countDocuments(filter);

  return { books, total, page, limit };
}

async function getOverdueList(schoolId) {
  return BorrowRecord.find({ school: schoolId, status: 'overdue', isDeleted: false })
    .populate('student', 'firstName lastName class')
    .populate('book', 'title');
}

module.exports = {
  addBook,
  updateBook,
  deleteBook,
  borrowBook,
  returnBook,
  checkOverdueBooks,
  getStudentBorrowHistory,
  searchBooks,
  getOverdueList,
};
