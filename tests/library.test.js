const School = require('../src/models/School');
const Student = require('../src/models/Student');
const User = require('../src/models/User');
const Book = require('../src/models/Book');
const BorrowRecord = require('../src/models/BorrowRecord');
const AuditLog = require('../src/models/AuditLog');
const Notification = require('../src/models/Notification');
const libraryService = require('../src/modules/library/library.service');

describe('Library service', () => {
  async function makeFixture() {
    const school = await School.create({ name: 'Library Demo School', email: `lib${Date.now()}@test.com` });
    const parent = await User.create({
      firstName: 'Parent', lastName: 'One', email: `parent${Date.now()}@test.com`,
      password: 'password123', role: 'parent', school: school._id,
    });
    const student = await Student.create({
      firstName: 'Ama', lastName: 'Boateng', school: school._id, parents: [parent._id],
    });
    const admin = await User.create({
      firstName: 'Admin', lastName: 'User', email: `admin${Date.now()}@test.com`,
      password: 'password123', role: 'school_admin', school: school._id,
    });
    return {
      school, parent, student, admin,
    };
  }

  test('addBook sets availableCopies from totalCopies and borrowBook decrements it', async () => {
    const { school, student, admin } = await makeFixture();

    const book = await libraryService.addBook(school._id, {
      title: 'Things Fall Apart', totalCopies: 3,
    }, admin._id);
    expect(book.availableCopies).toBe(3);

    const record = await libraryService.borrowBook(school._id, book._id, student._id, admin._id);
    expect(record.status).toBe('borrowed');

    const updatedBook = await Book.findById(book._id);
    expect(updatedBook.availableCopies).toBe(2);

    const notifications = await Notification.find({ type: 'library_overdue', title: 'Book Borrowed' });
    expect(notifications.map((n) => String(n.recipient))).toContain(String(student.parents[0]));

    const auditEntries = await AuditLog.find({ school: school._id, action: 'library.book.borrow' });
    expect(auditEntries).toHaveLength(1);
  });

  test('borrowBook throws when the student already has an overdue book', async () => {
    const { school, student, admin } = await makeFixture();
    const book = await libraryService.addBook(school._id, { title: 'Book A', totalCopies: 1 }, admin._id);
    const record = await libraryService.borrowBook(school._id, book._id, student._id, admin._id);
    await BorrowRecord.updateOne({ _id: record._id }, { status: 'overdue' });

    const book2 = await libraryService.addBook(school._id, { title: 'Book B', totalCopies: 1 }, admin._id);
    await expect(
      libraryService.borrowBook(school._id, book2._id, student._id, admin._id),
    ).rejects.toThrow('Student has overdue books. Return them before borrowing.');
  });

  test('returnBook calculates a fine for a late return and restores availableCopies', async () => {
    const { school, student, admin } = await makeFixture();
    const book = await libraryService.addBook(school._id, { title: 'Book C', totalCopies: 1 }, admin._id);
    const record = await libraryService.borrowBook(school._id, book._id, student._id, admin._id);

    const pastDue = new Date(Date.now() - 2.5 * 24 * 60 * 60 * 1000);
    await BorrowRecord.updateOne({ _id: record._id }, { dueDate: pastDue });

    const returned = await libraryService.returnBook(school._id, record._id, admin._id);
    expect(returned.status).toBe('returned');
    expect(returned.fine).toBe(3 * 50);
    expect(returned.finePaid).toBe(false);

    const updatedBook = await Book.findById(book._id);
    expect(updatedBook.availableCopies).toBe(1);
  });

  test('returnBook rejects a book that was already returned', async () => {
    const { school, student, admin } = await makeFixture();
    const book = await libraryService.addBook(school._id, { title: 'Book D', totalCopies: 1 }, admin._id);
    const record = await libraryService.borrowBook(school._id, book._id, student._id, admin._id);
    await libraryService.returnBook(school._id, record._id, admin._id);

    await expect(
      libraryService.returnBook(school._id, record._id, admin._id),
    ).rejects.toThrow('Book already returned.');
  });

  test('checkOverdueBooks flags borrowed records past their due date and notifies parents', async () => {
    const { school, student, admin } = await makeFixture();
    const book = await libraryService.addBook(school._id, { title: 'Book E', totalCopies: 1 }, admin._id);
    const record = await libraryService.borrowBook(school._id, book._id, student._id, admin._id);
    await BorrowRecord.updateOne({ _id: record._id }, { dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000) });

    const result = await libraryService.checkOverdueBooks(school._id);
    expect(result.flagged).toBe(1);

    const updated = await BorrowRecord.findById(record._id);
    expect(updated.status).toBe('overdue');

    const notifications = await Notification.find({ type: 'library_overdue', title: 'Overdue Library Book' });
    expect(notifications.map((n) => String(n.recipient))).toContain(String(student.parents[0]));
  });

  test('getStudentBorrowHistory rejects a parent requesting another family\'s student', async () => {
    const { school, student, admin } = await makeFixture();
    const otherParent = await User.create({
      firstName: 'Other', lastName: 'Parent', email: `otherparent${Date.now()}@test.com`,
      password: 'password123', role: 'parent', school: school._id,
    });

    await expect(
      libraryService.getStudentBorrowHistory(school._id, student._id, otherParent._id, 'parent'),
    ).rejects.toThrow('You are not authorized to view this student\'s library history.');
  });
});
