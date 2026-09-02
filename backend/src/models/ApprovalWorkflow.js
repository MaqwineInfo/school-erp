const mongoose = require('mongoose');

/**
 * A configurable approval workflow.
 *
 * Architecture §11 / RBAC §5. The previous engine had ONE step, a hard-coded approver
 * array, and handled only two resource types. This models all nine specified workflows
 * with amount-based escalation and maker-checker separation.
 */
const stepSchema = new mongoose.Schema(
  {
    order: { type: Number, required: true },
    name: { type: String, required: true }, // "Accountant verification"

    approverRule: {
      /**
       * role             — anyone holding this role slug
       * module_permission— anyone with `approve` on this module at the right scope
       * reporting_officer— the requester's manager
       * named_users      — an explicit list (POSH ICC members)
       */
      type: {
        type: String,
        enum: ['role', 'module_permission', 'reporting_officer', 'named_users'],
        default: 'role',
      },
      value: { type: String }, // role slug or module key
      userIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    },

    /** Step is skipped unless the condition holds. Amounts are in paise. */
    condition: {
      field: { type: String }, // 'amount' | 'percentage'
      op: { type: String, enum: ['gt', 'gte', 'lt', 'lte', 'eq', 'always'], default: 'always' },
      value: { type: Number },
      /** Read the threshold from Tenant.approvalThresholds instead of a literal. */
      thresholdKey: { type: String },
    },

    slaHours: { type: Number, default: 48 },
    /** The approver may not be the person who created the request. */
    makerCheckerSeparation: { type: Boolean, default: false },
    /** Rejection at this step ends the request rather than returning it. */
    terminalOnReject: { type: Boolean, default: true },
  },
  { _id: false },
);

const approvalWorkflowSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },

    key: {
      type: String,
      required: true,
      enum: [
        'fee_concession', 'staff_leave', 'payroll_release', 'mark_correction',
        'certificate_issue', 'expense', 'inventory_request', 'branch_transfer', 'admission',
      ],
    },
    name: { type: String, required: true },
    description: { type: String },
    module: { type: String, required: true },

    steps: { type: [stepSchema], default: [] },

    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

approvalWorkflowSchema.index({ tenantId: 1, key: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });

module.exports = mongoose.model('ApprovalWorkflow', approvalWorkflowSchema);
