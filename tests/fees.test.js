const mongoose = require('mongoose');
const crypto = require('crypto');
const School = require('../src/models/School');
const AcademicTerm = require('../src/models/AcademicTerm');
const Class = require('../src/models/Class');
const Student = require('../src/models/Student');
const User = require('../src/models/User');
const AuditLog = require('../src/models/AuditLog');
const Notification = require('../src/models/Notification');
const FeeInvoice = require('../src/models/FeeInvoice');
const FeePayment = require('../src/models/FeePayment');
const feesService = require('../src/modules/fees/fees.service');

describe('Fees service', () => {
  async function makeFixture() {
    const school = await School.create({ name: 'Fee Demo School', email: `feesvc${Date.now()}@test.com` });
    const term = await AcademicTerm.create({
      school: school._id, name: 'Term 1', academicYear: '2025/2026',
      startDate: new Date('2025-09-01'), endDate: new Date('2025-12-01'), isCurrent: true,
    });
    const klass = await Class.create({ name: 'Class 1', school: school._id });
    const parent = await User.create({
      firstName: 'Parent', lastName: 'One', email: `parent${Date.now()}@test.com`,
      password: 'password123', role: 'parent', school: school._id,
    });
    const student = await Student.create({
      firstName: 'Kojo', lastName: 'Mensah', school: school._id, class: klass._id, parents: [parent._id],
    });
    const admin = await User.create({
      firstName: 'Admin', lastName: 'User', email: `admin${Date.now()}@test.com`,
      password: 'password123', role: 'school_admin', school: school._id,
    });
    return { school, term, klass, parent, student, admin };
  }

  test('generateInvoices creates one invoice per active student and skips duplicates on rerun', async () => {
    const { school, term, admin } = await makeFixture();
    await feesService.createFeeStructure(school._id, {
      term: term._id, name: 'Tuition', amount: 15000, dueDate: new Date('2025-10-01'),
    }, admin._id);

    const first = await feesService.generateInvoices(school._id, term._id, admin._id);
    expect(first).toEqual({ generated: 1, skipped: 0 });

    const second = await feesService.generateInvoices(school._id, term._id, admin._id);
    expect(second).toEqual({ generated: 0, skipped: 1 });

    const auditEntries = await AuditLog.find({ school: school._id, action: 'fee.invoices.bulk_generate' });
    expect(auditEntries).toHaveLength(2);
  });

  test('generateInvoices only targets students in the fee structure class when one is set', async () => {
    const { school, term, klass, admin } = await makeFixture();
    const otherClass = await Class.create({ name: 'Class 2', school: school._id });
    await Student.create({ firstName: 'Ama', lastName: 'Otu', school: school._id, class: otherClass._id, parents: [] });

    await feesService.createFeeStructure(school._id, {
      term: term._id, class: klass._id, name: 'Class 1 Levy', amount: 5000, dueDate: new Date('2025-10-01'),
    }, admin._id);

    const result = await feesService.generateInvoices(school._id, term._id, admin._id);
    expect(result.generated).toBe(1); // only the Class 1 student, not the Class 2 student
  });

  test('recordPayment moves an invoice through partial to paid and notifies the parent', async () => {
    const { school, term, admin, student, parent } = await makeFixture();
    const structure = await feesService.createFeeStructure(school._id, {
      term: term._id, name: 'Tuition', amount: 15000, dueDate: new Date('2025-10-01'),
    }, admin._id);
    await feesService.generateInvoices(school._id, term._id, admin._id);
    const { invoices } = await feesService.getFeeInvoices(school._id, { term: term._id });
    const invoice = invoices.find((inv) => String(inv.student._id) === String(student._id));

    const partial = await feesService.recordPayment(school._id, invoice._id, {
      amount: 5000, paymentMethod: 'cash',
    }, admin._id);
    expect(partial.invoice.status).toBe('partial');
    expect(partial.invoice.balance).toBe(10000);

    const full = await feesService.recordPayment(school._id, invoice._id, {
      amount: 10000, paymentMethod: 'cash',
    }, admin._id);
    expect(full.invoice.status).toBe('paid');

    const notifications = await Notification.find({ recipient: parent._id, type: 'fee_paid' });
    expect(notifications).toHaveLength(2);

    const auditEntries = await AuditLog.find({ school: school._id, action: 'fee.payment.record' });
    expect(auditEntries).toHaveLength(2);
  });

  test('getStudentFeeStatement blocks a parent who does not own the student', async () => {
    const { school, term, admin, student } = await makeFixture();
    await feesService.createFeeStructure(school._id, {
      term: term._id, name: 'Tuition', amount: 15000, dueDate: new Date('2025-10-01'),
    }, admin._id);
    await feesService.generateInvoices(school._id, term._id, admin._id);

    const otherParent = await User.create({
      firstName: 'Other', lastName: 'Parent', email: `other${Date.now()}@test.com`,
      password: 'password123', role: 'parent', school: school._id,
    });

    await expect(
      feesService.getStudentFeeStatement(school._id, student._id, term._id, otherParent._id, 'parent'),
    ).rejects.toThrow();
  });

  test('handlePaystackFeeWebhook verifies the signature against the raw bytes, not the parsed body', async () => {
    const { school, term, admin, student } = await makeFixture();
    const structure = await feesService.createFeeStructure(school._id, {
      term: term._id, name: 'Tuition', amount: 15000, dueDate: new Date('2025-10-01'),
    }, admin._id);
    await feesService.generateInvoices(school._id, term._id, admin._id);
    const { invoices } = await feesService.getFeeInvoices(school._id, { term: term._id });
    const invoice = invoices.find((inv) => String(inv.student._id) === String(student._id));

    const payment = await FeePayment.create({
      school: school._id, invoice: invoice._id, student: student._id, amount: 15000,
      paymentMethod: 'paystack', paystackRef: 'ref-123', paystackStatus: 'pending',
    });

    const rawBody = Buffer.from(JSON.stringify({ event: 'charge.success', data: { reference: 'ref-123' } }));
    const validSignature = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY).update(rawBody).digest('hex');

    await feesService.handlePaystackFeeWebhook(rawBody, JSON.parse(rawBody.toString()), validSignature);

    expect((await FeePayment.findById(payment._id)).paystackStatus).toBe('success');
    expect((await FeeInvoice.findById(invoice._id)).status).toBe('paid');
  });

  test('handlePaystackFeeWebhook rejects a signature that does not match the raw request bytes', async () => {
    const rawBody = Buffer.from(JSON.stringify({ event: 'charge.success', data: { reference: 'ref-456' } }));
    const signatureForADifferentBody = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
      .update(Buffer.from('{"event":"charge.success","data":{"reference":"ref-456"}} '))
      .digest('hex');

    await expect(
      feesService.handlePaystackFeeWebhook(rawBody, JSON.parse(rawBody.toString()), signatureForADifferentBody),
    ).rejects.toThrow('Invalid Paystack signature.');
  });
});
