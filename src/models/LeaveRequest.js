const mongoose = require('mongoose');

const leaveRequestSchema = new mongoose.Schema({
  school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  staff: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  leaveType: {
    type: String,
    enum: ['annual', 'sick', 'maternity', 'paternity', 'study', 'other'],
    required: true,
  },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  totalDays: { type: Number, required: true }, // calculated by service, excludes weekends
  reason: { type: String, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'cancelled'], default: 'pending' },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reviewedAt: { type: Date, default: null },
  reviewNote: { type: String, default: null },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

leaveRequestSchema.index({ school: 1, staff: 1, status: 1 });

module.exports = mongoose.model('LeaveRequest', leaveRequestSchema);
