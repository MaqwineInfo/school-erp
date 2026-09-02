const mongoose = require('mongoose');

/**
 * Append-only lifecycle timeline — specification §5, Plan.docx §11, wireframe WF-0088.
 * "Inline timeline shows lifecycle events: certificates, awards, incidents."
 */
const studentTimelineEventSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },

    type: {
      type: String,
      enum: [
        'admitted', 'enrolled', 'promoted', 'detained', 'transferred', 'withdrawn',
        'award', 'achievement', 'incident', 'certificate_issued', 'fee_concession',
        'health_event', 'note',
      ],
      required: true,
    },
    title: { type: String, required: true },
    description: { type: String },
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },

    occurredAt: { type: Date, default: Date.now },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    /** Some entries (counsellor notes) are not visible to every role that can see the student. */
    visibility: {
      type: String,
      enum: ['all', 'staff', 'confidential'],
      default: 'all',
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

studentTimelineEventSchema.index({ tenantId: 1, studentId: 1, occurredAt: -1 });

module.exports = mongoose.model('StudentTimelineEvent', studentTimelineEventSchema);
