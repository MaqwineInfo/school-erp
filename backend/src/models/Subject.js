const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  name: { type: String, required: true, trim: true },
  code: { type: String, trim: true },
  type: { type: String, enum: ['core','language','elective','co_scholastic','practical','lab'], default: 'core' },
  maxMarks: { type: Number, default: 100 },
  passMarks: { type: Number, default: 35 },
  periodsPerWeek: { type: Number, default: 5 },
  standardIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Standard' }], // classes this subject applies to
  isActive: { type: Boolean, default: true },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

subjectSchema.index({ tenantId: 1, name: 1 });

module.exports = mongoose.model('Subject', subjectSchema);
