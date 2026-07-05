const mongoose = require('mongoose');

// Records each individual payment transaction against an invoice.
const feePaymentSchema = new mongoose.Schema({
  school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  invoice: { type: mongoose.Schema.Types.ObjectId, ref: 'FeeInvoice', required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  amount: { type: Number, required: true },
  paymentMethod: { type: String, enum: ['paystack', 'cash', 'bank_transfer', 'mobile_money'], required: true },
  paystackRef: { type: String, default: null },
  paystackStatus: { type: String, enum: ['pending', 'success', 'failed', null], default: null },
  paidAt: { type: Date, default: null },
  receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  // admin user who recorded a manual (cash/bank) payment
  receipt: { type: String, default: null }, // uploaded receipt URL
  notes: { type: String, default: null },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

feePaymentSchema.index({ school: 1, invoice: 1, paystackRef: 1 });

module.exports = mongoose.model('FeePayment', feePaymentSchema);
