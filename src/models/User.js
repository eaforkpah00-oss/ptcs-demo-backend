const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, select: false, minlength: 6 },
  role: { type: String, enum: ['teacher', 'parent', 'school_admin', 'super_admin', 'housemaster'], required: true },
  school: { type: mongoose.Schema.Types.ObjectId, ref: 'School' },
  profilePhoto: String,
  phone: String,
  isActive: { type: Boolean, default: true },
  lastLogin: Date,
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  // Only populated when role === 'teacher'
  staffProfileId: { type: mongoose.Schema.Types.ObjectId, ref: 'StaffProfile', default: null },
  subjectsTaught: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Subject' }],
  notificationPreferences: {
    channels: { type: [String], default: ['inApp'] },
  },
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.correctPassword = async function (candidate, hashed) {
  return bcrypt.compare(candidate, hashed);
};

userSchema.methods.changedPasswordAfter = function (jwtTimestamp) {
  if (this.passwordChangedAt) {
    const changed = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return jwtTimestamp < changed;
  }
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  return resetToken;
};

module.exports = mongoose.model('User', userSchema);
