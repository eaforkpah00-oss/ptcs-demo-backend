const mongoose = require('mongoose');

const boardingAttendanceSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  house: { type: mongoose.Schema.Types.ObjectId, ref: 'House', required: true },
  school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  date: { type: Date, required: true },
  period: { type: String, enum: ['morning', 'evening', 'night'], required: true },
  status: { type: String, enum: ['present', 'absent', 'permission', 'sick'], required: true },
  note: String,
  markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

boardingAttendanceSchema.index({ student: 1, house: 1, date: 1, period: 1 }, { unique: true });

module.exports = mongoose.model('BoardingAttendance', boardingAttendanceSchema);
