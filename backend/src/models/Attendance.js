const mongoose = require('mongoose');

/**
 * Daily or period-wise attendance for one academic group.
 *
 * Phase 7. The previous shape — one document per group per day, with student records
 * embedded — is kept, because attendance is always read and written a whole class at a
 * time. What is added:
 *
 *   - `source` per record, so biometric / RFID / QR ingestion is distinguishable from a
 *     manual mark (specification §9.1). The old model could only represent manual entry.
 *   - `corrections[]`, because specification §9 makes an edit after T+24h a Principal
 *     override, which has to be attributable.
 *   - `summary`, so a dashboard need not unwind the array.
 *   - `notifiedAt`, which makes the absence-notification sweep idempotent.
 */
const recordSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    status: {
      type: String,
      enum: ['present', 'absent', 'late', 'leave', 'half_day', 'holiday'],
      default: 'present',
    },
    source: {
      type: String,
      enum: ['manual', 'biometric', 'rfid', 'qr', 'face', 'import'],
      default: 'manual',
    },
    leaveType: { type: String, enum: ['medical', 'personal', 'sanctioned', ''], default: '' },
    inTime: { type: String },
    outTime: { type: String },
    remarks: { type: String },
  },
  { _id: false },
);

const correctionSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
    from: { type: String },
    to: { type: String },
    reason: { type: String },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    /** True when the change happened outside the free-edit window. */
    wasOverride: { type: Boolean, default: false },
    at: { type: Date, default: Date.now },
  },
  { _id: false },
);

const attendanceSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },

    academicGroupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AcademicGroup',
      required: true,
      index: true,
    },
    /** Legacy pair, dual-written during the migration window (architecture §21 step 4). */
    standardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Standard' },
    divisionName: { type: String },

    date: { type: Date, required: true },
    session: { type: String, enum: ['full_day', 'morning', 'afternoon'], default: 'full_day' },

    isPeriodWise: { type: Boolean, default: false },
    periodNo: { type: Number, default: 0 },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },

    records: { type: [recordSchema], default: [] },
    corrections: { type: [correctionSchema], default: [] },

    summary: {
      total: { type: Number, default: 0 },
      present: { type: Number, default: 0 },
      absent: { type: Number, default: 0 },
      late: { type: Number, default: 0 },
      leave: { type: Number, default: 0 },
    },

    markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    markedAt: { type: Date },
    notifiedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

attendanceSchema.index({ tenantId: 1, academicGroupId: 1, date: 1, periodNo: 1 }, { unique: true });
attendanceSchema.index({ tenantId: 1, date: -1 });
attendanceSchema.index({ notifiedAt: 1, date: -1 });

attendanceSchema.methods.recomputeSummary = function recomputeSummary() {
  const s = { total: this.records.length, present: 0, absent: 0, late: 0, leave: 0 };
  for (const r of this.records) {
    if (r.status === 'present' || r.status === 'half_day') s.present += 1;
    else if (r.status === 'absent') s.absent += 1;
    else if (r.status === 'late') { s.late += 1; s.present += 1; }
    else if (r.status === 'leave') s.leave += 1;
  }
  this.summary = s;
  return s;
};

attendanceSchema.pre('save', function recompute(next) {
  this.recomputeSummary();
  next();
});

module.exports = mongoose.model('Attendance', attendanceSchema);
