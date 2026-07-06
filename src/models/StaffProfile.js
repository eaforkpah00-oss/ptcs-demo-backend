const mongoose = require('mongoose');

const staffProfileSchema = new mongoose.Schema({
  school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true }, // one profile per user
  employeeId: { type: String, required: true }, // auto-incremented per school: EMP001, EMP002, etc.
  department: { type: String, default: null },
  qualification: { type: String, default: null },
  contractType: { type: String, enum: ['permanent', 'contract', 'intern'], default: 'permanent' },
  contractStart: { type: Date, default: null },
  contractEnd: { type: Date, default: null },
  salary: { type: Number, default: 0 }, // GHS pesewas
  bankName: { type: String, default: null },
  bankAccount: { type: String, default: null }, // stored encrypted (see src/utils/encryption.js)
  nationalId: { type: String, default: null }, // stored encrypted (see src/utils/encryption.js)
  emergencyContact: {
    name: { type: String, default: null },
    phone: { type: String, default: null },
    relationship: { type: String, default: null },
  },
  documents: [{
    name: String,
    url: String, // Cloudinary URL
    uploadedAt: { type: Date, default: Date.now },
  }],
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

staffProfileSchema.index({ school: 1, employeeId: 1 }, { unique: true });

module.exports = mongoose.model('StaffProfile', staffProfileSchema);
