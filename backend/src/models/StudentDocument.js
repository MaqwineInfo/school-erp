const mongoose = require('mongoose');

/**
 * Documents vault — specification §5.1 / wireframe WF-0086.
 * Separate from Student because it grows unbounded and carries its own verification state.
 * Files live in object storage; only the key is kept here and served via a signed URL.
 */
const studentDocumentSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },

    type: {
      type: String,
      enum: [
        'birth_certificate', 'aadhaar', 'previous_tc', 'marksheet', 'address_proof',
        'caste_certificate', 'income_certificate', 'medical', 'photo', 'other',
      ],
      required: true,
    },
    name: { type: String },
    storageKey: { type: String, required: true },
    mimeType: { type: String },
    sizeBytes: { type: Number },

    verified: { type: Boolean, default: false },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: { type: Date },
    rejectionReason: { type: String },

    expiresAt: { type: Date },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

studentDocumentSchema.index({ tenantId: 1, studentId: 1, type: 1 });

module.exports = mongoose.model('StudentDocument', studentDocumentSchema);
