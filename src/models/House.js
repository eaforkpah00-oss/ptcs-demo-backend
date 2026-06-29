const mongoose = require('mongoose');

const houseSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, trim: true },
  school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  type: { type: String, enum: ['boys', 'girls', 'mixed'], required: true },
  housemaster: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  matron: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  capacity: { type: Number, required: true },
  block: String,
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('House', houseSchema);
