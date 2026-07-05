const mongoose = require('mongoose');

// Defines what a student in a given class owes in a given term.
const feeStructureSchema = new mongoose.Schema({
  school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  term: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicTerm', required: true },
  class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', default: null },
  // null class means this fee applies to ALL classes in the school
  name: { type: String, required: true }, // e.g. 'Tuition Fee', 'Sports Levy', 'PTA Dues'
  amount: { type: Number, required: true }, // GHS pesewas (integer). GHS 150.00 = 15000 pesewas.
  currency: { type: String, default: 'GHS' },
  dueDate: { type: Date, required: true },
  isCompulsory: { type: Boolean, default: true },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

feeStructureSchema.index({ school: 1, term: 1, isDeleted: 1 });

module.exports = mongoose.model('FeeStructure', feeStructureSchema);
