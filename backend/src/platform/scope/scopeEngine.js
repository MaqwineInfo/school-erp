/**
 * Scope engine — turns (principal × effective permission) into a concrete Scope.
 *
 * Architecture §6.2. This is where `branchScope: 'own_branch'`, `dataScope: 'division'`
 * and `studentScope: 'own_children'` stop being strings on a document and become actual
 * arrays of ids that a query can use.
 *
 * Note what is NOT here: any hard-coded role name. The previous `applyBranchScope`
 * decided branch access with `['trustee'].includes(user.role)` — a role string that
 * existed in no enum. Branch access now comes from the permission's `branchScope` plus
 * the user's branch assignments, and nothing else (architecture §6.5).
 */
const { Scope, ALL } = require('./scope');
const { createAssignmentProvider } = require('./assignmentProvider');

/**
 * @param {object} principal  req.principal
 * @param {object} permission the effective permission for this module
 * @param {object} opts       { module, action, provider }
 */
async function resolveScope(principal, permission, { module, action, provider } = {}) {
  const p = provider || createAssignmentProvider();

  // ── Branch ────────────────────────────────────────────────────────────────
  let branchIds;
  switch (permission.branchScope) {
    case 'all_branches':
      branchIds = ALL;
      break;
    case 'assigned_branches':
      branchIds = principal.assignedBranchIds?.length
        ? principal.assignedBranchIds
        : [principal.branchId].filter(Boolean);
      break;
    case 'own_branch':
      branchIds = [principal.branchId].filter(Boolean);
      // A user with no branch assigned in a single-branch tenant should not be locked out;
      // an unset branchId means "the tenant's only branch", which ALL resolves correctly
      // because tenantId still constrains the query.
      if (!branchIds.length) branchIds = ALL;
      break;
    case 'none':
    default:
      branchIds = [];
      break;
  }

  // ── Academic year (temporal scope) ────────────────────────────────────────
  let academicYearIds = ALL;
  if (permission.temporalScope === 'current_ay') {
    const current = await p.currentAcademicYear(principal);
    // If the tenant has no active year yet (fresh onboarding), do not filter it out.
    academicYearIds = current ? [current] : ALL;
  }

  // ── Data scope ────────────────────────────────────────────────────────────
  let groupIds = [];
  let departmentIds = [];

  if (permission.dataScope === 'division' || permission.dataScope === 'own') {
    groupIds = await p.groupsFor(principal);
  }
  if (permission.dataScope === 'department') {
    departmentIds = await p.departmentsFor(principal);
  }

  // ── Student scope ─────────────────────────────────────────────────────────
  let studentIds = ALL;
  switch (permission.studentScope) {
    case 'all':
      studentIds = ALL;
      break;
    case 'assigned_students':
      studentIds = await p.assignedStudentsFor(principal);
      break;
    case 'own_children':
      studentIds = principal.linkedStudentIds || [];
      break;
    case 'own':
      studentIds = principal.studentId ? [principal.studentId] : [];
      break;
    case 'none':
    default:
      studentIds = [];
      break;
  }

  return new Scope({
    tenantId: principal.tenantId,
    branchIds,
    academicYearIds,
    dataScope: permission.dataScope,
    departmentIds,
    groupIds,
    studentScope: permission.studentScope,
    studentIds,
    userId: principal.userId,
    module,
    action,
  });
}

/**
 * Apply the optional narrowing headers/params. Both may narrow, never widen (§6.2).
 */
function applyRequestNarrowing(scope, req) {
  let s = scope;
  const branchHeader = req.get?.('X-Branch-Id') || req.headers?.['x-branch-id'];
  if (branchHeader) s = s.withBranch(branchHeader);
  if (req.query?.academicYearId) s = s.withAcademicYear(req.query.academicYearId);
  return s;
}

module.exports = { resolveScope, applyRequestNarrowing };
