/**
 * Scope profiles — how each collection maps onto the scope dimensions.
 *
 * Architecture §6.3. A repository needs to know which of ITS fields correspond to branch,
 * academic year, student, academic group, department and owner. A field left undefined
 * means that dimension does not constrain this collection.
 *
 * Adding a new dimension later means editing this file and BaseRepository — not 36
 * controllers.
 */

/**
 * @typedef {Object} ScopeProfile
 * @property {string}  [branchField]    e.g. 'branchId'
 * @property {string}  [yearField]      e.g. 'academicYearId'
 * @property {string}  [studentField]   e.g. 'studentId' ('_id' on the Student collection)
 * @property {string}  [groupField]     e.g. 'academicGroupId' — drives dataScope 'division'
 * @property {string}  [deptField]      e.g. 'departmentId'    — drives dataScope 'department'
 * @property {string}  [ownerField]     e.g. 'createdBy'       — drives dataScope 'own'
 * @property {string[]} [legacyGroupFields] TRANSITIONAL: the [standard, division] field pair
 *                                    used before AcademicGroup exists (Phase 3)
 * @property {boolean} [softDelete]     defaults true; adds { deletedAt: null }
 * @property {boolean} [tenantOptional] platform collections not owned by a tenant
 */

/** The default assumed for a tenant-scoped, branch-owned, soft-deleted collection. */
const DEFAULT_PROFILE = {
  branchField: 'branchId',
  softDelete: true,
};

const profiles = {
  // ─── Core academic ────────────────────────────────────────────────────────────
  Student: {
    legacyGroupFields: ['standardId', 'divisionName'],
    branchField: 'branchId',
    yearField: 'academicYearId',
    studentField: '_id',
    groupField: 'academicGroupId',
    ownerField: null,
    softDelete: true,
  },
  Enrolment: {
    legacyGroupFields: ['standardId', 'divisionName'],
    branchField: 'branchId',
    yearField: 'academicYearId',
    studentField: 'studentId',
    groupField: 'academicGroupId',
    softDelete: true,
  },
  AcademicGroup: {
    branchField: 'branchId',
    yearField: 'academicYearId',
    groupField: '_id',
    softDelete: true,
  },
  // Master data: `branchOptional` means a record with no branchId is shared by every
  // branch of the tenant, rather than being invisible to all of them.
  // NOT year-scoped: this collection IS the years. Constraining it to the active year
  // would leave an administrator unable to see or create any other year.
  AcademicYear: { branchField: 'branchId', branchOptional: true, softDelete: true },
  Course: { branchField: 'branchId', branchOptional: true, softDelete: true },
  Department: { branchField: 'branchId', branchOptional: true, deptField: '_id', softDelete: true },
  StudentDocument: { branchField: 'branchId', studentField: 'studentId', ownerField: 'uploadedBy', softDelete: true },
  StudentTimelineEvent: { branchField: 'branchId', studentField: 'studentId', ownerField: 'recordedBy', softDelete: false },
  Standard: { branchField: 'branchId', branchOptional: true, softDelete: true },
  Subject: { branchField: 'branchId', branchOptional: true, deptField: 'departmentId', softDelete: true },
  Syllabus: { branchField: 'branchId', branchOptional: true, deptField: 'departmentId', softDelete: true },

  // ─── Daily operations ─────────────────────────────────────────────────────────
  Attendance: {
    legacyGroupFields: ['standardId', 'divisionName'],
    branchField: 'branchId',
    yearField: 'academicYearId',
    groupField: 'academicGroupId',
    ownerField: 'markedBy',
    softDelete: false,
  },
  Timetable: {
    legacyGroupFields: ['standardId', 'divisionName'],
    branchField: 'branchId',
    yearField: 'academicYearId',
    groupField: 'academicGroupId',
    softDelete: true,
  },
  Homework: {
    legacyGroupFields: ['standardId', 'divisionName'],
    branchField: 'branchId',
    groupField: 'academicGroupId',
    ownerField: 'assignedBy',
    softDelete: true,
  },
  StudyMaterial: {
    legacyGroupFields: ['standardId', 'divisionName'],
    branchField: 'branchId',
    groupField: 'academicGroupId',
    ownerField: 'uploadedBy',
    softDelete: true,
  },

  // ─── Assessment ───────────────────────────────────────────────────────────────
  Exam: { branchField: 'branchId', branchOptional: true, yearField: 'academicYearId', softDelete: true },
  GradeScheme: { branchField: 'branchId', branchOptional: true, softDelete: true },
  MarksEntry: {
    legacyGroupFields: ['standardId', 'divisionName'],
    branchField: 'branchId',
    studentField: 'studentId',
    groupField: 'academicGroupId',
    ownerField: 'enteredBy',
    softDelete: false,
  },

  // ─── Money ────────────────────────────────────────────────────────────────────
  FeeStructure: { branchField: 'branchId', yearField: 'academicYearId', softDelete: true },
  FeeHead: { branchField: 'branchId', branchOptional: true, softDelete: true },
  Concession: { branchField: 'branchId', yearField: 'academicYearId', studentField: 'studentId', ownerField: 'requestedBy', softDelete: true },
  LedgerEntry: { branchField: 'branchId', yearField: 'academicYearId', studentField: 'studentId', softDelete: false },
  FeeDemand: {
    branchField: 'branchId',
    yearField: 'academicYearId',
    studentField: 'studentId',
    softDelete: true,
  },
  FeePayment: {
    branchField: 'branchId',
    studentField: 'studentId',
    ownerField: 'collectedBy',
    softDelete: true,
  },
  Expense: { branchField: 'branchId', ownerField: 'requestedBy', softDelete: true },
  Payroll: { branchField: 'branchId', ownerField: 'staffId', softDelete: true },

  // ─── People ───────────────────────────────────────────────────────────────────
  Staff: { branchField: 'branchId', deptField: 'departmentId', softDelete: true },
  User: { branchField: 'branchId', ownerField: '_id', softDelete: true },
  Leave: { branchField: 'branchId', ownerField: 'staffId', softDelete: true },

  // ─── Student-linked services ──────────────────────────────────────────────────
  Library: { branchField: 'branchId', softDelete: true },
  Transport: { branchField: 'branchId', softDelete: true },
  Hostel: { branchField: 'branchId', softDelete: true },
  HealthRecord: { branchField: 'branchId', studentField: 'studentId', softDelete: true },
  DisciplineRecord: { branchField: 'branchId', studentField: 'studentId', softDelete: true },
  Certificate: { branchField: 'branchId', studentField: 'studentId', softDelete: true },
  Alumni: { branchField: 'branchId', studentField: 'studentId', softDelete: true },

  // ─── Front office / misc ──────────────────────────────────────────────────────
  Enquiry: { branchField: 'branchId', yearField: 'academicYearId', softDelete: true },
  Visitor: { branchField: 'branchId', ownerField: 'recordedBy', softDelete: true },
  Notice: { branchField: 'branchId', ownerField: 'createdBy', softDelete: true },
  Event: { branchField: 'branchId', softDelete: true },
  Inventory: { branchField: 'branchId', softDelete: true },
  Task: { branchField: 'branchId', ownerField: 'assignedTo', softDelete: true },
  MealMenu: { branchField: 'branchId', softDelete: true },

  // ─── Platform (tenant-scoped but not branch-owned) ────────────────────────────
  Branch: { branchField: '_id', softDelete: true },
  Role: { branchField: null, softDelete: true },
  UserRole: { branchField: null, softDelete: false },
  Session: { branchField: null, ownerField: 'userId', softDelete: false },
  LoginAttempt: { tenantOptional: true, branchField: null, softDelete: false },
  // branchOptional: a group-level approval (payroll release, inter-branch transfer)
  // legitimately has no single branch and must still reach its approvers.
  ApprovalRequest: { branchField: 'branchId', branchOptional: true, ownerField: 'requestedBy', softDelete: false },
  ApprovalWorkflow: { branchField: null, softDelete: true },
  AuditLog: { branchField: 'branchId', ownerField: 'userId', softDelete: false },
  Notification: { branchField: 'branchId', branchOptional: true, studentField: 'studentId', softDelete: false },
  NotificationTemplate: { branchField: null, softDelete: true },
  SmsLog: { branchField: 'branchId', softDelete: false },

  // ─── Global, not tenant-owned ─────────────────────────────────────────────────
  Tenant: { tenantOptional: true, branchField: null, softDelete: true },
  Plan: { tenantOptional: true, branchField: null, softDelete: false },
  Permission: { tenantOptional: true, branchField: null, softDelete: false },
  Sequence: { tenantOptional: false, branchField: 'branchId', softDelete: false },
  OutboxEvent: { tenantOptional: true, branchField: null, softDelete: false },
  Migration: { tenantOptional: true, branchField: null, softDelete: false },
};

function profileFor(modelName) {
  return { ...DEFAULT_PROFILE, ...(profiles[modelName] || {}) };
}

module.exports = { profiles, profileFor, DEFAULT_PROFILE };
