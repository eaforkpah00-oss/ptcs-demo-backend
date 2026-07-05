const mongoose = require('mongoose');

// One invoice per student per fee structure item.
const feeInvoiceSchema = new mongoose.Schema({
  school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  feeStructure: { type: mongoose.Schema.Types.ObjectId, ref: 'FeeStructure', required: true },
  term: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicTerm', required: true },
  amountDue: { type: Number, required: true },
  amountPaid: { type: Number, default: 0 },
  status: { type: String, enum: ['unpaid', 'partial', 'paid', 'waived'], default: 'unpaid' },
  dueDate: { type: Date, required: true },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

feeInvoiceSchema.virtual('balance').get(function () {
  return this.amountDue - this.amountPaid;
});

feeInvoiceSchema.index({ school: 1, student: 1, term: 1, isDeleted: 1 });
// Prevents duplicate invoices for the same student + fee item
feeInvoiceSchema.index({ school: 1, feeStructure: 1, student: 1 }, { unique: true });

module.exports = mongoose.model('FeeInvoice', feeInvoiceSchema);
