const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  date: { type: Date, required: true },
  status: { type: String, enum: ['present', 'absent', 'tardy', 'excused'], required: true },
  markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  note: String,
}, { timestamps: true });

attendanceSchema.index({ student: 1, class: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
