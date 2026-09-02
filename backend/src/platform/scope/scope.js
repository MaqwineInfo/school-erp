/**
 * Scope — the resolved data-access boundary for one request.
 *
 * Architecture §6.2. This object is the ONLY input a repository needs in order to build a
 * query. It is produced by the scope engine from (principal × module × permission) and is
 * immutable once created.
 *
 * The problem this solves: the previous implementation computed `req.rbacScope` on every
 * request and no controller ever read it, so branchScope/dataScope/studentScope were
 * decorative. Scope is now mandatory — a repository cannot build a filter without one.
 */

/** Sentinel meaning "no restriction on this dimension". */
const ALL = 'ALL';

const DATA_SCOPE_RANK = { none: 0, own: 1, division: 2, department: 3, school: 4, group: 5 };
const BRANCH_SCOPE_RANK = { none: 0, own_branch: 1, assigned_branches: 2, all_branches: 3 };
const STUDENT_SCOPE_RANK = { none: 0, own: 1, own_children: 1, assigned_students: 2, all: 3 };

class Scope {
  constructor(props) {
    if (!props.tenantId && !props.isSystem) {
      throw new Error('Scope requires a tenantId (or must be a system scope)');
    }

    this.tenantId = props.tenantId ?? null;
    this.branchIds = props.branchIds ?? ALL;
    this.academicYearIds = props.academicYearIds ?? ALL;
    this.dataScope = props.dataScope ?? 'school';
    this.departmentIds = props.departmentIds ?? [];
    this.groupIds = props.groupIds ?? [];
    this.studentScope = props.studentScope ?? 'all';
    this.studentIds = props.studentIds ?? ALL;
    this.userId = props.userId ?? null;
    this.module = props.module ?? null;
    this.action = props.action ?? null;

    this.isSystem = !!props.isSystem;
    this.reason = props.reason ?? null;
    this.isCrossBranch = !!props.isCrossBranch;

    Object.freeze(this);
  }

  /**
   * A scope for background jobs, migrations and the platform console.
   * Deliberately loud: every construction is logged, and a lint rule forbids calling this
   * from modules/** outside *.jobs.js (architecture §6.4).
   */
  static system(reason, { tenantId = null } = {}) {
    if (!reason) throw new Error('Scope.system() requires a reason string');
    // Lazily required so this module stays importable in tests without a logger.
    try {
      require('../../config/logger').info('Scope.system created', { reason, tenantId });
    } catch {
      /* logger unavailable (unit test context) — not fatal */
    }
    return new Scope({
      tenantId,
      isSystem: true,
      reason,
      branchIds: ALL,
      academicYearIds: ALL,
      dataScope: 'group',
      studentScope: 'all',
      studentIds: ALL,
    });
  }

  /** Narrow an existing scope to a single branch (the X-Branch-Id header). */
  withBranch(branchId) {
    if (!branchId) return this;
    const id = String(branchId);

    // A header may narrow, never widen.
    if (this.branchIds !== ALL && !this.branchIds.map(String).includes(id)) {
      return new Scope({ ...this.toJSON(), branchIds: [] }); // out of scope → matches nothing
    }
    return new Scope({ ...this.toJSON(), branchIds: [branchId] });
  }

  /** Narrow to a specific academic year (the ?academicYearId query param). */
  withAcademicYear(yearId) {
    if (!yearId) return this;
    const id = String(yearId);
    if (this.academicYearIds !== ALL && !this.academicYearIds.map(String).includes(id)) {
      return new Scope({ ...this.toJSON(), academicYearIds: [] });
    }
    return new Scope({ ...this.toJSON(), academicYearIds: [yearId] });
  }

  get isAllBranches() {
    return this.branchIds === ALL;
  }

  get isAllStudents() {
    return this.studentIds === ALL;
  }

  /** True when this scope can see data belonging to more than one branch. */
  get spansMultipleBranches() {
    return this.branchIds === ALL || this.branchIds.length > 1;
  }

  toJSON() {
    return {
      tenantId: this.tenantId,
      branchIds: this.branchIds,
      academicYearIds: this.academicYearIds,
      dataScope: this.dataScope,
      departmentIds: this.departmentIds,
      groupIds: this.groupIds,
      studentScope: this.studentScope,
      studentIds: this.studentIds,
      userId: this.userId,
      module: this.module,
      action: this.action,
      isSystem: this.isSystem,
      reason: this.reason,
      isCrossBranch: this.isCrossBranch,
    };
  }
}

/** Widest-wins helpers for multi-role resolution (architecture §7.3). */
const widest = {
  dataScope: (values) =>
    values.reduce((a, b) => ((DATA_SCOPE_RANK[b] ?? 0) > (DATA_SCOPE_RANK[a] ?? 0) ? b : a), 'none'),
  branchScope: (values) =>
    values.reduce(
      (a, b) => ((BRANCH_SCOPE_RANK[b] ?? 0) > (BRANCH_SCOPE_RANK[a] ?? 0) ? b : a),
      'none',
    ),
  studentScope: (values) =>
    values.reduce(
      (a, b) => ((STUDENT_SCOPE_RANK[b] ?? 0) > (STUDENT_SCOPE_RANK[a] ?? 0) ? b : a),
      'none',
    ),
};

module.exports = {
  Scope,
  ALL,
  widest,
  DATA_SCOPE_RANK,
  BRANCH_SCOPE_RANK,
  STUDENT_SCOPE_RANK,
};
