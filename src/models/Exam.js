const mongoose = require('mongoose');

const examSchema = new mongoose.Schema({
  school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  term: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicTerm', required: true },
  class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', default: null }, // null = school-wide exam
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  title: { type: String, required: true },
  examDate: { type: Date, required: true },
  startTime: { type: String, required: true }, // e.g. '09:00'
  durationMins: { type: Number, required: true },
  venue: { type: String, default: null },
  totalMarks: { type: Number, required: true },
  instructions: { type: String, default: null },
  status: {
    type: String,
    enum: ['scheduled', 'ongoing', 'completed', 'cancelled'],
    default: 'scheduled',
  },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

examSchema.index({ school: 1, class: 1, subject: 1, term: 1, examDate: 1 });

module.exports = mongoose.model('Exam', examSchema);
