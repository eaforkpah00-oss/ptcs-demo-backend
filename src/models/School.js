const mongoose = require('mongoose');

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
  settings: { type: mongoose.Schema.Types.Mixed, default: {} },
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
