const mongoose = require('mongoose');

const academicSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },
  school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  subject: { type: String, required: true },
  assessmentType: { type: String, required: true },
  title: { type: String, required: true },
  score: { type: Number, required: true },
  maxScore: { type: Number, required: true },
  grade: String,
  feedback: String,
  date: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Academic', academicSchema);
