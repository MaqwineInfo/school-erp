/**
 * The nine approval workflows from RBAC §5, as seedable configuration.
 *
 * Thresholds reference `Tenant.approvalThresholds` by key rather than hard-coding a
 * number, so each school can reconfigure them in Settings → Approval Thresholds exactly
 * as RBAC Appendix B specifies.
 */

const ALWAYS = { op: 'always' };

const WORKFLOWS = [
  {
    key: 'fee_concession',
    name: 'Fee Concession',
    module: 'fees',
    description: 'Class teacher or admission officer requests; accountant verifies; principal approves; trustee for large waivers.',
    steps: [
      {
        order: 1,
        name: 'Accountant verification',
        approverRule: { type: 'role', value: 'accountant' },
        condition: ALWAYS,
        slaHours: 24,
      },
      {
        order: 2,
        name: 'Principal approval',
        approverRule: { type: 'role', value: 'principal' },
        condition: ALWAYS,
        slaHours: 48,
      },
      {
        order: 3,
        name: 'Trustee approval (large waiver)',
        approverRule: { type: 'role', value: 'trustee' },
        // Only when the waiver exceeds the tenant's level-1 percentage.
        condition: { field: 'percentage', op: 'gt', thresholdKey: 'feeWaiverPercentL1' },
        slaHours: 120,
      },
    ],
  },

  {
    key: 'staff_leave',
    name: 'Staff Leave',
    module: 'hr',
    description: 'Reporting officer → HR verifies balance → principal approves.',
    steps: [
      { order: 1, name: 'Reporting officer', approverRule: { type: 'reporting_officer' }, condition: ALWAYS, slaHours: 24 },
      { order: 2, name: 'HR verification', approverRule: { type: 'role', value: 'hr_manager' }, condition: ALWAYS, slaHours: 24 },
      { order: 3, name: 'Principal approval', approverRule: { type: 'role', value: 'principal' }, condition: ALWAYS, slaHours: 24 },
    ],
  },

  {
    key: 'payroll_release',
    name: 'Payroll Release',
    module: 'payroll',
    description: 'HR prepares, accountant checks, principal authorises, finance controller for large runs. Maker ≠ checker ≠ approver.',
    steps: [
      {
        order: 1,
        name: 'Accountant verification',
        approverRule: { type: 'role', value: 'accountant' },
        condition: ALWAYS,
        slaHours: 24,
        makerCheckerSeparation: true, // the preparer cannot verify
      },
      {
        order: 2,
        name: 'Principal authorisation',
        approverRule: { type: 'role', value: 'principal' },
        condition: ALWAYS,
        slaHours: 24,
        makerCheckerSeparation: true,
      },
      {
        order: 3,
        name: 'Finance controller sign-off',
        approverRule: { type: 'role', value: 'group_finance_controller' },
        condition: { field: 'amount', op: 'gt', thresholdKey: 'expenseL2' },
        slaHours: 48,
        makerCheckerSeparation: true,
      },
    ],
  },

  {
    key: 'mark_correction',
    name: 'Mark Correction (post-lock)',
    module: 'examinations',
    description: 'Teacher requests; HoD verifies; exam coordinator unlocks; principal approves published changes.',
    steps: [
      { order: 1, name: 'HoD verification', approverRule: { type: 'role', value: 'hod' }, condition: ALWAYS, slaHours: 24 },
      { order: 2, name: 'Exam coordinator unlock', approverRule: { type: 'role', value: 'exam_coordinator' }, condition: ALWAYS, slaHours: 24 },
      {
        order: 3,
        name: 'Principal approval (published result)',
        approverRule: { type: 'role', value: 'principal' },
        condition: { field: 'isPublished', op: 'eq', value: 1 },
        slaHours: 24,
      },
    ],
  },

  {
    key: 'certificate_issue',
    name: 'Certificate / TC Issuance',
    module: 'certificates',
    description: 'Class teacher requests; accountant confirms fee clearance; librarian confirms library clearance; principal signs.',
    steps: [
      { order: 1, name: 'Fee clearance', approverRule: { type: 'role', value: 'accountant' }, condition: ALWAYS, slaHours: 24 },
      { order: 2, name: 'Library clearance', approverRule: { type: 'role', value: 'librarian' }, condition: ALWAYS, slaHours: 24 },
      { order: 3, name: 'Principal sign-off', approverRule: { type: 'role', value: 'principal' }, condition: ALWAYS, slaHours: 48 },
    ],
  },

  {
    key: 'expense',
    name: 'Expense Voucher',
    module: 'expenses',
    description: 'Requester → HoD → accountant budget check → principal → finance controller above threshold.',
    steps: [
      { order: 1, name: 'Department head', approverRule: { type: 'role', value: 'hod' }, condition: ALWAYS, slaHours: 24 },
      { order: 2, name: 'Accountant budget check', approverRule: { type: 'role', value: 'accountant' }, condition: ALWAYS, slaHours: 24 },
      {
        order: 3,
        name: 'Principal approval',
        approverRule: { type: 'role', value: 'principal' },
        condition: { field: 'amount', op: 'gt', thresholdKey: 'pettyCashLimit' },
        slaHours: 48,
      },
      {
        order: 4,
        name: 'Finance controller approval',
        approverRule: { type: 'role', value: 'group_finance_controller' },
        condition: { field: 'amount', op: 'gt', thresholdKey: 'expenseL1' },
        slaHours: 72,
      },
    ],
  },

  {
    key: 'inventory_request',
    name: 'Inventory Indent / Purchase Order',
    module: 'inventory',
    description: 'Store manager verifies stock; accountant checks budget; principal approves; finance controller above threshold.',
    steps: [
      { order: 1, name: 'Store manager', approverRule: { type: 'role', value: 'store_manager' }, condition: ALWAYS, slaHours: 24 },
      { order: 2, name: 'Accountant budget check', approverRule: { type: 'role', value: 'accountant' }, condition: ALWAYS, slaHours: 24 },
      {
        order: 3,
        name: 'Principal approval',
        approverRule: { type: 'role', value: 'principal' },
        condition: { field: 'amount', op: 'gt', thresholdKey: 'inventoryPoL1' },
        slaHours: 48,
      },
      {
        order: 4,
        name: 'Finance controller approval',
        approverRule: { type: 'role', value: 'group_finance_controller' },
        condition: { field: 'amount', op: 'gt', thresholdKey: 'inventoryPoL2' },
        slaHours: 72,
      },
    ],
  },

  {
    key: 'branch_transfer',
    name: 'Inter-branch Student Transfer',
    module: 'students',
    description: 'Dues and library clearance, source principal approves departure, destination principal confirms admission.',
    steps: [
      { order: 1, name: 'Dues clearance', approverRule: { type: 'role', value: 'accountant' }, condition: ALWAYS, slaHours: 24 },
      { order: 2, name: 'Source principal', approverRule: { type: 'role', value: 'principal' }, condition: ALWAYS, slaHours: 48 },
      { order: 3, name: 'Destination principal', approverRule: { type: 'role', value: 'principal' }, condition: ALWAYS, slaHours: 48 },
    ],
  },

  {
    key: 'admission',
    name: 'Admission Decision',
    module: 'admissions',
    description: 'Admission officer verifies documents; admission head reviews merit; principal confirms.',
    steps: [
      { order: 1, name: 'Document verification', approverRule: { type: 'role', value: 'admission_officer' }, condition: ALWAYS, slaHours: 48 },
      { order: 2, name: 'Merit review', approverRule: { type: 'role', value: 'admission_head' }, condition: ALWAYS, slaHours: 48 },
      { order: 3, name: 'Principal confirmation', approverRule: { type: 'role', value: 'principal' }, condition: ALWAYS, slaHours: 48 },
    ],
  },
];

module.exports = { WORKFLOWS };
