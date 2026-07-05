const mongoose = require('mongoose');

// Never soft-deleted — this is the permanent write log for every module.
const auditLogSchema = new mongoose.Schema({
  school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true }, // e.g. 'fee.structure.create'
  targetId: { type: mongoose.Schema.Types.ObjectId, default: null },
  targetType: { type: String, default: null },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

auditLogSchema.index({ school: 1, action: 1, createdAt: -1 });

auditLogSchema.statics.record = function ({ school, user, action, targetId = null, targetType = null, metadata = {} }) {
  return this.create({ school, user, action, targetId, targetType, metadata });
};

module.exports = mongoose.model('AuditLog', auditLogSchema);
