const { z } = require('zod');

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');

const emergencyContact = z.object({
  name: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  relationship: z.string().optional().nullable(),
});

const createStaffProfile = z.object({
  user: objectId,
  department: z.string().optional().nullable(),
  qualification: z.string().optional().nullable(),
  contractType: z.enum(['permanent', 'contract', 'intern']).optional(),
  contractStart: z.coerce.date().optional().nullable(),
  contractEnd: z.coerce.date().optional().nullable(),
  salary: z.number().min(0).optional(),
  bankName: z.string().optional().nullable(),
  bankAccount: z.string().optional().nullable(),
  nationalId: z.string().optional().nullable(),
  emergencyContact: emergencyContact.optional(),
});

const updateStaffProfile = z.object({
  department: z.string().optional().nullable(),
  qualification: z.string().optional().nullable(),
  contractType: z.enum(['permanent', 'contract', 'intern']).optional(),
  contractStart: z.coerce.date().optional().nullable(),
  contractEnd: z.coerce.date().optional().nullable(),
  salary: z.number().min(0).optional(),
  bankName: z.string().optional().nullable(),
  bankAccount: z.string().optional().nullable(),
  nationalId: z.string().optional().nullable(),
  emergencyContact: emergencyContact.optional(),
});

const submitLeaveRequest = z.object({
  leaveType: z.enum(['annual', 'sick', 'maternity', 'paternity', 'study', 'other']),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  reason: z.string().min(1),
});

const reviewLeaveRequest = z.object({
  status: z.enum(['approved', 'rejected']),
  reviewNote: z.string().optional().nullable(),
});

const getPayrollSummary = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int(),
});

module.exports = {
  createStaffProfile,
  updateStaffProfile,
  submitLeaveRequest,
  reviewLeaveRequest,
  getPayrollSummary,
};
