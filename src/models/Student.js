const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  studentId: String,
  school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },
  parents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  gender: { type: String, enum: ['male', 'female', 'other'] },
  dateOfBirth: Date,
  profilePhoto: String,
  isActive: { type: Boolean, default: true },
  house: { type: mongoose.Schema.Types.ObjectId, ref: 'House' },
  boardingStatus: { type: String, enum: ['day', 'boarding'], default: 'day' },
  roomNumber: String,
  medicalNotes: { type: String, default: null },
  admissionNumber: { type: String, default: null },
  houseColor: { type: String, default: null },
  libraryCardNo: { type: String, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Student', studentSchema);
