const mongoose = require('mongoose');

const welfareSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  house: { type: mongoose.Schema.Types.ObjectId, ref: 'House', required: true },
  housemaster: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  date: { type: Date, default: Date.now },
  category: {
    type: String,
    enum: ['health', 'discipline', 'permission', 'parent-contact', 'incident', 'other'],
    required: true,
  },
  description: { type: String, required: true },
  actionTaken: String,
  severity: { type: String, enum: ['low', 'medium', 'high'] },
  parentNotified: { type: Boolean, default: false },
  followUpRequired: { type: Boolean, default: false },
  followUpDate: Date,
}, { timestamps: true });

module.exports = mongoose.model('Welfare', welfareSchema);
