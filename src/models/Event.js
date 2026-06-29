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
}, { timestamps: true });

module.exports = mongoose.model('Event', eventSchema);
