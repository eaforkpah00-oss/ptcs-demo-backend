const mongoose = require('mongoose');

const borrowRecordSchema = new mongoose.Schema({
  school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  book: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  borrowedAt: { type: Date, default: Date.now },
  dueDate: { type: Date, required: true },
  returnedAt: { type: Date, default: null },
  status: { type: String, enum: ['borrowed', 'returned', 'overdue'], default: 'borrowed' },
  fine: { type: Number, default: 0 }, // stored in GHS pesewas
  finePaid: { type: Boolean, default: false },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

borrowRecordSchema.index({ school: 1, student: 1, status: 1 });
borrowRecordSchema.index({ school: 1, dueDate: 1, status: 1 }); // used by the daily overdue check cron job

module.exports = mongoose.model('BorrowRecord', borrowRecordSchema);
