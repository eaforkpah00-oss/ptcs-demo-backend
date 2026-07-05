const mongoose = require('mongoose');

const academicTermSchema = new mongoose.Schema({
  school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  name: { type: String, required: true, trim: true }, // e.g. 'Term 1 2025/2026'
  academicYear: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  isCurrent: { type: Boolean, default: false },
}, { timestamps: true });

academicTermSchema.index({ school: 1, isCurrent: 1 });

// Only one current term per school — setting one to current unsets the rest.
academicTermSchema.pre('save', async function (next) {
  if (this.isCurrent && this.isModified('isCurrent')) {
    await this.constructor.updateMany(
      { school: this.school, _id: { $ne: this._id } },
      { isCurrent: false },
    );
  }
  next();
});

module.exports = mongoose.model('AcademicTerm', academicTermSchema);
