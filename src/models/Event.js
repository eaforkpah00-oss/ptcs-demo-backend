const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  startTime: String,
  endTime: String,
  location: String,
  status: { type: String, enum: ['upcoming', 'ongoing', 'completed', 'cancelled'], default: 'upcoming' },
  targetAudience: [{ type: String, enum: ['all', 'teachers', 'parents', 'students'] }],
  // SMS-merge calendar fields (step 2.7). `type` above stays free-text for Phase 1
  // callers; eventType is the calendar module's stricter category and mirrors it.
  eventType: {
    type: String,
    enum: ['holiday', 'exam', 'sports', 'meeting', 'cultural', 'other'],
    default: 'other',
  },
  allDay: { type: Boolean, default: true },
  affectsClasses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Class' }], // empty = whole school
  color: { type: String, default: '#3B82F6' }, // hex color for calendar UI rendering
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

eventSchema.index({ school: 1, startDate: 1, endDate: 1 });

module.exports = mongoose.model('Event', eventSchema);
