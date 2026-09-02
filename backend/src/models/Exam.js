const mongoose = require('mongoose');

/**
 * An examination.
 *
 * Phase 10. Adds the state machine the previous model lacked — without a `status` there
 * was nothing to stop marks being edited after publication, and nothing to gate
 * publication behind Principal approval (specification §11.3, Plan.docx §14).
 */
const scheduleSchema = new mongoose.Schema(
  {
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
    academicGroupId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicGroup' },
    date: { type: Date, required: true },
    startTime: { type: String },
    endTime: { type: String },
    room: { type: String },
    invigilatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    maxMarks: { type: Number, default: 100 },
    passMarks: { type: Number, default: 33 },
  },
  { _id: false },
);

const examSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },

    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['unit_test', 'half_yearly', 'annual', 'pre_board', 'practical', 'project', 'viva', 'mcq', 'olympiad', 'internal'],
      default: 'unit_test',
    },
    termId: { type: mongoose.Schema.Types.ObjectId },

    /** Which cohorts and subjects this exam covers — drives the publish readiness check. */
    academicGroupIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'AcademicGroup' }],
    subjectIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Subject' }],

    gradeSchemeId: { type: mongoose.Schema.Types.ObjectId, ref: 'GradeScheme' },

    startDate: { type: Date },
    endDate: { type: Date },
    schedule: { type: [scheduleSchema], default: [] },

    /**
     * draft → scheduled → in_progress → marks_entry → locked → published
     * Marks can only be entered before `locked`; results only publish from `locked`.
     */
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'in_progress', 'marks_entry', 'locked', 'published'],
      default: 'draft',
      index: true,
    },

    /** Rank on the report card can be suppressed per school (specification §11.5). */
    showRank: { type: Boolean, default: true },

    publishedAt: { type: Date },
    publishedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

examSchema.index({ tenantId: 1, academicYearId: 1, status: 1 });

/** No two papers for the same cohort on the same day (specification §8.5). */
examSchema.methods.findDateClashes = function findDateClashes() {
  const seen = new Map();
  const clashes = [];

  for (const slot of this.schedule) {
    const key = `${slot.academicGroupId}:${new Date(slot.date).toDateString()}`;
    if (seen.has(key)) {
      clashes.push({ academicGroupId: slot.academicGroupId, date: slot.date, subjects: [seen.get(key), slot.subjectId] });
    } else {
      seen.set(key, slot.subjectId);
    }
  }

  return clashes;
};

module.exports = mongoose.model('Exam', examSchema);
