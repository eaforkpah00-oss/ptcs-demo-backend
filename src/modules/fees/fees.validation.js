const { z } = require('zod');

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');

const createFeeStructure = z.object({
  term: objectId,
  class: objectId.optional().nullable(),
  name: z.string().min(1),
  amount: z.number().int().positive(),
  dueDate: z.coerce.date(),
  isCompulsory: z.boolean().optional(),
});

const updateFeeStructure = z.object({
  name: z.string().min(1).optional(),
  amount: z.number().int().positive().optional(),
  dueDate: z.coerce.date().optional(),
});

const generateInvoices = z.object({
  term: objectId,
});

const recordPayment = z.object({
  invoice: objectId,
  amount: z.number().int().positive(),
  paymentMethod: z.enum(['paystack', 'cash', 'bank_transfer', 'mobile_money']),
  paystackRef: z.string().optional(),
  notes: z.string().optional(),
});

const getFeeInvoices = z.object({
  term: objectId.optional(),
  classId: objectId.optional(),
  status: z.enum(['unpaid', 'partial', 'paid', 'waived']).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
});

module.exports = {
  createFeeStructure,
  updateFeeStructure,
  generateInvoices,
  recordPayment,
  getFeeInvoices,
};
