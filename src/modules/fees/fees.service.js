const crypto = require('crypto');
const axios = require('axios');
const FeeStructure = require('../../models/FeeStructure');
const FeeInvoice = require('../../models/FeeInvoice');
const FeePayment = require('../../models/FeePayment');
const Student = require('../../models/Student');
const Class = require('../../models/Class');
const User = require('../../models/User');
const Notification = require('../../models/Notification');
const AuditLog = require('../../models/AuditLog');
const AppError = require('../../utils/appError');
const { sendNotification } = require('../../services/notification.service');

function computeStatus(invoice) {
  if (invoice.amountPaid <= 0) return 'unpaid';
  if (invoice.amountPaid >= invoice.amountDue) return 'paid';
  return 'partial';
}

async function applyPaymentToInvoice(invoice, amount) {
  invoice.amountPaid += amount;
  invoice.status = computeStatus(invoice);
  await invoice.save();
  return invoice;
}

async function createFeeStructure(schoolId, data, adminId) {
  const structure = await FeeStructure.create({
    school: schoolId,
    term: data.term,
    class: data.class || null,
    name: data.name,
    amount: data.amount,
    dueDate: data.dueDate,
    isCompulsory: data.isCompulsory !== undefined ? data.isCompulsory : true,
    createdBy: adminId,
  });
  await AuditLog.record({
    school: schoolId, user: adminId, action: 'fee.structure.create',
    targetId: structure._id, targetType: 'FeeStructure',
  });
  return structure;
}

async function getFeeStructures(schoolId, { term, page = 1, limit = 20 } = {}) {
  const filter = { school: schoolId, isDeleted: false };
  if (term) filter.term = term;
  const skip = (page - 1) * limit;
  const [structures, total] = await Promise.all([
    FeeStructure.find(filter).populate('class', 'name').skip(skip).limit(limit).sort('-createdAt'),
    FeeStructure.countDocuments(filter),
  ]);
  return { structures, total };
}

async function updateFeeStructure(schoolId, structureId, data, adminId) {
  const structure = await FeeStructure.findOne({ _id: structureId, school: schoolId, isDeleted: false });
  if (!structure) throw new AppError('Fee structure not found.', 404);
  Object.assign(structure, data, { updatedBy: adminId });
  await structure.save();
  await AuditLog.record({
    school: schoolId, user: adminId, action: 'fee.structure.update',
    targetId: structure._id, targetType: 'FeeStructure',
  });
  return structure;
}

async function deleteFeeStructure(schoolId, structureId, adminId) {
  const structure = await FeeStructure.findOneAndUpdate(
    { _id: structureId, school: schoolId, isDeleted: false },
    { isDeleted: true, deletedAt: new Date(), updatedBy: adminId },
    { new: true },
  );
  if (!structure) throw new AppError('Fee structure not found.', 404);
  await AuditLog.record({
    school: schoolId, user: adminId, action: 'fee.structure.delete',
    targetId: structure._id, targetType: 'FeeStructure',
  });
  return structure;
}

async function generateInvoices(schoolId, termId, adminId) {
  const structures = await FeeStructure.find({ school: schoolId, term: termId, isDeleted: false });
  if (structures.length === 0) return { generated: 0, skipped: 0 };

  const students = await Student.find({ school: schoolId, isActive: true });
  let generated = 0;
  let skipped = 0;

  for (const student of students) {
    for (const structure of structures) {
      if (structure.class && String(structure.class) !== String(student.class)) continue;

      const exists = await FeeInvoice.findOne({
        school: schoolId, student: student._id, feeStructure: structure._id,
      });
      if (exists) {
        skipped += 1;
        continue;
      }

      const invoice = await FeeInvoice.create({
        school: schoolId,
        student: student._id,
        feeStructure: structure._id,
        term: termId,
        amountDue: structure.amount,
        dueDate: structure.dueDate,
        createdBy: adminId,
      });
      generated += 1;

      for (const parentId of student.parents || []) {
        await sendNotification(
          parentId,
          'fee',
          'Fee Invoice Generated',
          `An invoice of GHS ${(structure.amount / 100).toFixed(2)} has been raised for ${student.firstName} ${student.lastName}. Due by ${invoice.dueDate.toDateString()}.`,
          { schoolId, invoiceId: invoice._id },
        );
      }
    }
  }

  await AuditLog.record({
    school: schoolId, user: adminId, action: 'fee.invoices.bulk_generate',
    metadata: { term: termId, generated, skipped },
  });
  return { generated, skipped };
}

async function getFeeInvoices(schoolId, { term, classId, status, page = 1, limit = 20 } = {}) {
  const filter = { school: schoolId, isDeleted: false };
  if (term) filter.term = term;
  if (status) filter.status = status;
  if (classId) {
    const studentIds = await Student.find({ school: schoolId, class: classId }).distinct('_id');
    filter.student = { $in: studentIds };
  }
  const skip = (page - 1) * limit;
  const [invoices, total] = await Promise.all([
    FeeInvoice.find(filter)
      .populate('student', 'firstName lastName class')
      .populate('feeStructure', 'name amount')
      .skip(skip).limit(limit).sort('-createdAt'),
    FeeInvoice.countDocuments(filter),
  ]);
  return { invoices, total };
}

async function recordPayment(schoolId, invoiceId, paymentData, adminId) {
  const invoice = await FeeInvoice.findOne({ _id: invoiceId, school: schoolId, isDeleted: false }).populate('student');
  if (!invoice) throw new AppError('Invoice not found.', 404);

  const payment = await FeePayment.create({
    school: schoolId,
    invoice: invoice._id,
    student: invoice.student._id,
    amount: paymentData.amount,
    paymentMethod: paymentData.paymentMethod,
    paystackRef: paymentData.paystackRef || null,
    notes: paymentData.notes || null,
    receivedBy: adminId,
    paidAt: new Date(),
  });

  await applyPaymentToInvoice(invoice, paymentData.amount);

  const student = invoice.student;
  const balance = invoice.amountDue - invoice.amountPaid;
  const body = invoice.status === 'paid'
    ? `Payment of GHS ${(paymentData.amount / 100).toFixed(2)} received. ${student.firstName} ${student.lastName} fee balance is now GHS 0.`
    : `Payment of GHS ${(paymentData.amount / 100).toFixed(2)} received. Remaining balance: GHS ${(balance / 100).toFixed(2)}.`;

  for (const parentId of student.parents || []) {
    await sendNotification(parentId, 'fee_paid', 'Fee Payment Received', body, { schoolId, invoiceId: invoice._id });
  }

  await AuditLog.record({
    school: schoolId, user: adminId, action: 'fee.payment.record',
    targetId: payment._id, targetType: 'FeePayment',
  });

  return { invoice, payment };
}

async function initializePaystackPayment(schoolId, invoiceId, parentId) {
  const invoice = await FeeInvoice.findOne({ _id: invoiceId, school: schoolId, isDeleted: false }).populate('student');
  if (!invoice) throw new AppError('Invoice not found.', 404);
  if (!(invoice.student.parents || []).map(String).includes(String(parentId))) {
    throw new AppError('You are not authorized to pay this invoice.', 403);
  }

  const parent = await User.findById(parentId);
  const amount = invoice.amountDue - invoice.amountPaid;
  const reference = crypto.randomUUID();

  const response = await axios.post('https://api.paystack.co/transaction/initialize', {
    amount,
    email: parent.email,
    reference,
    callback_url: `${process.env.CLIENT_URL}/parent/fees/success`,
  }, {
    headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
  });

  await FeePayment.create({
    school: schoolId,
    invoice: invoice._id,
    student: invoice.student._id,
    amount,
    paymentMethod: 'paystack',
    paystackRef: reference,
    paystackStatus: 'pending',
  });

  return { authorizationUrl: response.data.data.authorization_url, reference };
}

async function handlePaystackFeeWebhook(rawBody, payload, signature) {
  const hash = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY).update(rawBody).digest('hex');
  if (hash !== signature) throw new AppError('Invalid Paystack signature.', 401);

  const { event, data } = payload;

  if (event === 'charge.success') {
    const payment = await FeePayment.findOne({ paystackRef: data.reference });
    if (!payment) return;
    if (payment.paystackStatus === 'success') return; // idempotent — already processed

    payment.paystackStatus = 'success';
    payment.paidAt = new Date();
    await payment.save();

    const invoice = await FeeInvoice.findById(payment.invoice);
    if (invoice) await applyPaymentToInvoice(invoice, payment.amount);

    await AuditLog.record({
      school: payment.school, action: 'fee.webhook.charge_success',
      targetId: payment._id, targetType: 'FeePayment',
    });
  } else if (event === 'charge.failed') {
    const payment = await FeePayment.findOneAndUpdate(
      { paystackRef: data.reference },
      { paystackStatus: 'failed' },
      { new: true },
    );
    if (payment) {
      await AuditLog.record({
        school: payment.school, action: 'fee.webhook.charge_failed',
        targetId: payment._id, targetType: 'FeePayment',
      });
    }
  }
}

async function getStudentFeeStatement(schoolId, studentId, termId, requestingUserId, requestingRole) {
  if (requestingRole === 'parent') {
    const student = await Student.findOne({ _id: studentId, school: schoolId });
    if (!student || !(student.parents || []).map(String).includes(String(requestingUserId))) {
      throw new AppError("You are not authorized to view this student's fees.", 403);
    }
  }

  const invoices = await FeeInvoice.find({ school: schoolId, student: studentId, term: termId, isDeleted: false })
    .populate('feeStructure', 'name amount dueDate');
  const invoiceIds = invoices.map((inv) => inv._id);
  const payments = await FeePayment.find({ invoice: { $in: invoiceIds }, isDeleted: false });

  const paymentsByInvoice = {};
  for (const p of payments) {
    const key = String(p.invoice);
    paymentsByInvoice[key] = paymentsByInvoice[key] || [];
    paymentsByInvoice[key].push(p);
  }

  const totalDue = invoices.reduce((sum, inv) => sum + inv.amountDue, 0);
  const totalPaid = invoices.reduce((sum, inv) => sum + inv.amountPaid, 0);

  return {
    invoices: invoices.map((inv) => ({ ...inv.toObject({ virtuals: true }), payments: paymentsByInvoice[String(inv._id)] || [] })),
    totalDue,
    totalPaid,
    totalOutstanding: totalDue - totalPaid,
  };
}

async function getSchoolFeeReport(schoolId, termId) {
  const invoices = await FeeInvoice.find({ school: schoolId, term: termId, isDeleted: false })
    .populate({ path: 'student', select: 'class' });

  const byClass = {};
  for (const inv of invoices) {
    const classId = inv.student && inv.student.class ? String(inv.student.class) : 'unassigned';
    byClass[classId] = byClass[classId] || { totalDue: 0, totalPaid: 0 };
    byClass[classId].totalDue += inv.amountDue;
    byClass[classId].totalPaid += inv.amountPaid;
  }

  const classIds = Object.keys(byClass).filter((id) => id !== 'unassigned');
  const classes = await Class.find({ _id: { $in: classIds } }).select('name');
  const classNameMap = {};
  classes.forEach((c) => { classNameMap[String(c._id)] = c.name; });

  const rows = Object.entries(byClass).map(([classId, totals]) => ({
    classId,
    className: classNameMap[classId] || 'Unassigned',
    totalDue: totals.totalDue,
    totalPaid: totals.totalPaid,
    outstanding: totals.totalDue - totals.totalPaid,
    collectionRate: totals.totalDue > 0 ? Number(((totals.totalPaid / totals.totalDue) * 100).toFixed(1)) : 0,
  }));

  const schoolTotals = rows.reduce(
    (acc, r) => ({ totalDue: acc.totalDue + r.totalDue, totalPaid: acc.totalPaid + r.totalPaid }),
    { totalDue: 0, totalPaid: 0 },
  );

  return {
    classes: rows,
    schoolTotals: {
      ...schoolTotals,
      outstanding: schoolTotals.totalDue - schoolTotals.totalPaid,
      collectionRate: schoolTotals.totalDue > 0
        ? Number(((schoolTotals.totalPaid / schoolTotals.totalDue) * 100).toFixed(1))
        : 0,
    },
  };
}

async function sendPaymentReminders(schoolId) {
  const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const invoices = await FeeInvoice.find({
    school: schoolId,
    isDeleted: false,
    status: { $in: ['unpaid', 'partial'] },
    dueDate: { $lt: sevenDaysFromNow },
  }).populate('student');

  let remindersSent = 0;
  for (const invoice of invoices) {
    const student = invoice.student;
    if (!student) continue;
    for (const parentId of student.parents || []) {
      const recentReminder = await Notification.findOne({
        recipient: parentId, type: 'fee_reminder', createdAt: { $gte: sevenDaysAgo },
      });
      if (recentReminder) continue;

      const balance = invoice.amountDue - invoice.amountPaid;
      await sendNotification(
        parentId,
        'fee_reminder',
        'Fee Payment Reminder',
        `${student.firstName} ${student.lastName}'s fee balance of GHS ${(balance / 100).toFixed(2)} is due soon.`,
        { schoolId, invoiceId: invoice._id },
      );
      remindersSent += 1;
    }
  }
  return { remindersSent };
}

module.exports = {
  createFeeStructure,
  getFeeStructures,
  updateFeeStructure,
  deleteFeeStructure,
  generateInvoices,
  getFeeInvoices,
  recordPayment,
  initializePaystackPayment,
  handlePaystackFeeWebhook,
  getStudentFeeStatement,
  getSchoolFeeReport,
  sendPaymentReminders,
};
