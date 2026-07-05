const mongoose = require('mongoose');

const timetableSchema = new mongoose.Schema({
  school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  term: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicTerm', required: true },
  dayOfWeek: {
    type: String,
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    required: true,
  },
  periodNumber: { type: Number, required: true, min: 1, max: 10 },
  startTime: { type: String, required: true }, // e.g. '08:00'
  endTime: { type: String, required: true }, // e.g. '08:45'
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  room: { type: String, default: null },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

// Prevents double-booking a class for the same slot. Soft-deleted rows are excluded
// so a cancelled period frees the slot for a new one.
timetableSchema.index(
  { school: 1, class: 1, term: 1, dayOfWeek: 1, periodNumber: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } },
);
timetableSchema.index({ school: 1, teacher: 1, term: 1 });

module.exports = mongoose.model('Timetable', timetableSchema);
