const mongoose = require('mongoose');

/**
 * One student's marks for one subject in one exam.
 *
 * Rewritten in Phase 10 to close defect A6. The previous version upserted
 * unconditionally: it overwrote entries already in `verified` status, never checked that
 * marks fell within the maximum, and recorded no previous value — so a mark could change
 * with no trace and no authorisation.
 *
 * `lockState` is the gate. Once `locked`, a change requires the mark-correction workflow
 * (RBAC §5.4) and lands through a time-boxed unlock window.
 */
const revisionSchema = new mongoose.Schema(
  {
    from: { type: Number },
    to: { type: Number },
    reason: { type: String },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvalRequestId: { type: mongoose.Schema.Types.ObjectId, ref: 'ApprovalRequest' },
    at: { type: Date, default: Date.now },
  },
  { _id: false },
);

const marksEntrySchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },

    examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
    academicGroupId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicGroup', index: true },
    standardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Standard' },
    divisionName: { type: String },

    marksObtained: { type: Number, min: 0 },
    maxMarks: { type: Number, default: 100, min: 1 },
    passMarks: { type: Number, default: 33 },
    grade: { type: String },
    gradePoint: { type: Number },
    isAbsent: { type: Boolean, default: false },
    remarks: { type: String },

    /**
     * draft     — teacher is still entering
     * submitted — handed to the HoD
     * verified  — HoD has checked it
     * locked    — final; changes need the correction workflow
     * unlocked  — a correction window is open (see unlockExpiresAt)
     */
    lockState: {
      type: String,
      enum: ['draft', 'submitted', 'verified', 'locked', 'unlocked'],
      default: 'draft',
      index: true,
    },

    enteredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    lockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    lockedAt: { type: Date },

    /** RBAC §5.4 — the unlock window expires automatically after 24 hours. */
    unlockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    unlockExpiresAt: { type: Date },

    /** Every change to a non-draft mark, with old value, new value and reason. */
    revisions: { type: [revisionSchema], default: [] },
  },
  { timestamps: true },
);

marksEntrySchema.index({ tenantId: 1, examId: 1, studentId: 1, subjectId: 1 }, { unique: true });
marksEntrySchema.index({ tenantId: 1, examId: 1, academicGroupId: 1 });

/** Is this entry currently editable? */
marksEntrySchema.methods.isEditable = function isEditable(at = new Date()) {
  if (['draft', 'submitted'].includes(this.lockState)) return true;
  if (this.lockState === 'unlocked') return !this.unlockExpiresAt || this.unlockExpiresAt > at;
  return false; // verified or locked
};

marksEntrySchema.methods.percentage = function percentage() {
  if (this.isAbsent || this.marksObtained == null) return null;
  return (this.marksObtained / this.maxMarks) * 100;
};

module.exports = mongoose.model('MarksEntry', marksEntrySchema);
