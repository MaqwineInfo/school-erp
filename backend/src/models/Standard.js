const mongoose = require('mongoose');

const standardSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  name: { type: String, required: true }, // e.g. "Class 8", "Grade 10"
  shortName: { type: String }, // "8", "10"
  order: { type: Number, required: true }, // for sorting: Nursery=0, LKG=1, Class1=3 ...
  stage: { type: String, enum: ['pre_primary','primary','middle','secondary','senior_secondary'], default: 'primary' },
  streams: [{ type: String, enum: ['science','commerce','arts','vocational'] }],
  divisions: [{
    name: { type: String, required: true }, // A, B, C — UI label: Section
    classTeacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    strength: { type: Number, default: 0 },
    maxCapacity: { type: Number, default: 40 },
  }],
  isActive: { type: Boolean, default: true },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

standardSchema.index({ tenantId: 1, order: 1 });

module.exports = mongoose.model('Standard', standardSchema);
