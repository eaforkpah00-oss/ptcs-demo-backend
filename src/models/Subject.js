const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
  school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  name: { type: String, required: true, trim: true },
  code: { type: String, default: null },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

subjectSchema.index({ school: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Subject', subjectSchema);
