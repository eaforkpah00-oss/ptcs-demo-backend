const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  school: { type: mongoose.Schema.Types.ObjectId, ref: 'School' },
  type: { type: String, required: true },
  title: { type: String, required: true },
  body: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  link: String,
  data: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
