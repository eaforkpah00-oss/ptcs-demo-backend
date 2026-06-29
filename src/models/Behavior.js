const mongoose = require('mongoose');

const behaviorSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },
  school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  date: { type: Date, default: Date.now },
  type: { type: String, enum: ['positive', 'negative', 'neutral', 'concern'], required: true },
  category: String,
  description: { type: String, required: true },
  actionTaken: String,
  severity: { type: String, enum: ['low', 'medium', 'high'] },
  parentNotified: { type: Boolean, default: false },
  followUpRequired: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Behavior', behaviorSchema);
