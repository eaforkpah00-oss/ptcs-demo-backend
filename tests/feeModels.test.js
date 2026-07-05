const mongoose = require('mongoose');
const School = require('../src/models/School');
const AcademicTerm = require('../src/models/AcademicTerm');
const Student = require('../src/models/Student');
const FeeStructure = require('../src/models/FeeStructure');
const FeeInvoice = require('../src/models/FeeInvoice');
const FeePayment = require('../src/models/FeePayment');

describe('Fee management models', () => {
  async function makeSchoolTermStudent() {
    const school = await School.create({ name: 'Fee School', email: `fee${Date.now()}@test.com` });
    const term = await AcademicTerm.create({
      school: school._id, name: 'Term 1', academicYear: '2025/2026',
      startDate: new Date('2025-09-01'), endDate: new Date('2025-12-01'), isCurrent: true,
    });
    const student = await Student.create({ firstName: 'Ama', lastName: 'Boateng', school: school._id });
    return { school, term, student };
  }

  test('FeeInvoice.balance virtual reflects amountDue - amountPaid', async () => {
    const { school, term, student } = await makeSchoolTermStudent();
    const admin = new mongoose.Types.ObjectId();
    const structure = await FeeStructure.create({
      school: school._id, term: term._id, name: 'Tuition', amount: 15000,
      dueDate: new Date('2025-10-01'), createdBy: admin,
    });
    const invoice = await FeeInvoice.create({
      school: school._id, student: student._id, feeStructure: structure._id, term: term._id,
      amountDue: 15000, amountPaid: 5000, dueDate: structure.dueDate, createdBy: admin,
    });
    expect(invoice.balance).toBe(10000);
  });

  test('duplicate FeeInvoice for same student + fee structure is rejected', async () => {
    const { school, term, student } = await makeSchoolTermStudent();
    const admin = new mongoose.Types.ObjectId();
    const structure = await FeeStructure.create({
      school: school._id, term: term._id, name: 'PTA Dues', amount: 2000,
      dueDate: new Date('2025-10-01'), createdBy: admin,
    });
    await FeeInvoice.create({
      school: school._id, student: student._id, feeStructure: structure._id, term: term._id,
      amountDue: 2000, dueDate: structure.dueDate, createdBy: admin,
    });
    await expect(FeeInvoice.create({
      school: school._id, student: student._id, feeStructure: structure._id, term: term._id,
      amountDue: 2000, dueDate: structure.dueDate, createdBy: admin,
    })).rejects.toThrow();
  });

  test('FeePayment records a transaction against an invoice', async () => {
    const { school, term, student } = await makeSchoolTermStudent();
    const admin = new mongoose.Types.ObjectId();
    const structure = await FeeStructure.create({
      school: school._id, term: term._id, name: 'Tuition', amount: 15000,
      dueDate: new Date('2025-10-01'), createdBy: admin,
    });
    const invoice = await FeeInvoice.create({
      school: school._id, student: student._id, feeStructure: structure._id, term: term._id,
      amountDue: 15000, dueDate: structure.dueDate, createdBy: admin,
    });
    const payment = await FeePayment.create({
      school: school._id, invoice: invoice._id, student: student._id,
      amount: 5000, paymentMethod: 'cash', receivedBy: admin, paidAt: new Date(),
    });
    expect(payment.amount).toBe(5000);
  });
});
