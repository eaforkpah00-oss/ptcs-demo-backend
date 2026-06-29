const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  targetAudience: [{ type: String, enum: ['all', 'teachers', 'parents'] }],
  priority: { type: String, enum: ['normal', 'important', 'urgent'], default: 'normal' },
  isPinned: { type: Boolean, default: false },
  isPublished: { type: Boolean, default: true },
  expiryDate: Date,
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

module.exports = mongoose.model('Announcement', announcementSchema);
