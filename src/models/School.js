const mongoose = require('mongoose');

// strict: false lets schools keep any ad-hoc settings keys already saved under
// Phase 1 while still giving the SMS-merge fields real schema defaults.
const settingsSchema = new mongoose.Schema({
  gradingScale: {
    type: [{ min: Number, max: Number, grade: String }],
    default: [
      { min: 80, max: 100, grade: 'A' },
      { min: 70, max: 79, grade: 'B' },
      { min: 60, max: 69, grade: 'C' },
      { min: 50, max: 59, grade: 'D' },
      { min: 0, max: 49, grade: 'F' },
    ],
  },
  loanPeriodDays: { type: Number, default: 14 },
  finePerDayPesewas: { type: Number, default: 50 },
  workingDays: {
    type: [String],
    default: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  },
}, { _id: false, strict: false });

const schoolSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  phone: String,
  address: {
    street: String, city: String, state: String, country: String, zip: String,
  },
  type: { type: String, enum: ['primary', 'secondary', 'mixed', 'university'], default: 'secondary' },
  logo: String,
  website: String,
  settings: { type: settingsSchema, default: () => ({}) },
  enrollmentCode: { type: String, unique: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

schoolSchema.pre('save', function (next) {
  if (!this.enrollmentCode) {
    this.enrollmentCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  }
  next();
});

module.exports = mongoose.model('School', schoolSchema);
