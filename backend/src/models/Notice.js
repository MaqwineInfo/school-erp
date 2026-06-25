const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  title: { type: String, required: true },
  content: { type: String, required: true },
  type: { type: String, enum: ['general','academic','fee','exam','event','emergency','other'], default: 'general' },
  audience: {
    scope: { type: String, enum: ['school','standard','division','staff','parents','students'], default: 'school' },
    standardIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Standard' }],
    divisionNames: [{ type: String }],
    roles: [{ type: String }],
  },
  attachments: [{ name: String, url: String }],
  publishAt: { type: Date, default: Date.now },
  expiresAt: { type: Date },
  isPublished: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

noticeSchema.index({ tenantId: 1, isPublished: 1, publishAt: -1 });

module.exports = mongoose.model('Notice', noticeSchema);
