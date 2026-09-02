/**
 * Academic structure service — years, terms, standards, courses, groups, subjects.
 *
 * Presents one vocabulary regardless of `Tenant.institutionType`: a "group" is a section
 * for a school and a batch for a coaching centre (feature-brainstorm §6).
 */
const mongoose = require('mongoose');

const uow = require('../../platform/uow/unitOfWork');
const { repo } = require('../../infra/repository/BaseRepository');
const { BusinessRuleError, NotFoundError, ConflictError } = require('../../shared/errors');
const { tenantCache } = require('../../infra/cache/versionedCache');

const years = () => repo(mongoose.model('AcademicYear'));
const standards = () => repo(mongoose.model('Standard'));
const courses = () => repo(mongoose.model('Course'));
const groups = () => repo(mongoose.model('AcademicGroup'));
const subjects = () => repo(mongoose.model('Subject'));
const departments = () => repo(mongoose.model('Department'));

// ── Academic years ───────────────────────────────────────────────────────────

async function activeYear(scope) {
  return tenantCache.wrap('academic:activeYear', String(scope.tenantId), async () => {
    const AcademicYear = mongoose.model('AcademicYear');
    return AcademicYear.findOne({ tenantId: scope.tenantId, isActive: true, deletedAt: null }).lean();
  });
}

async function requireActiveYear(scope) {
  const ay = await activeYear(scope);
  if (!ay) {
    throw new BusinessRuleError(
      'No active academic year. Create one under Academics → Academic Years before continuing.',
    );
  }
  return ay;
}

async function createYear(scope, data) {
  if (new Date(data.endDate) <= new Date(data.startDate)) {
    throw new BusinessRuleError('The academic year must end after it starts');
  }
  const created = await years().create(scope, data);
  tenantCache.bump('academic:activeYear');
  return created;
}

/** Exactly one year is active at a time. */
async function activateYear(scope, yearId) {
  return uow.run(async (session) => {
    const AcademicYear = mongoose.model('AcademicYear');
    const target = await years().findById(scope, yearId, { session });
    if (!target) throw new NotFoundError('Academic year not found');

    await AcademicYear.updateMany(
      { tenantId: scope.tenantId, _id: { $ne: yearId } },
      { $set: { isActive: false } },
      { session },
    );
    target.isActive = true;
    await target.save({ session });

    tenantCache.bump('academic:activeYear');
    return target;
  });
}

// ── Standards (school) ───────────────────────────────────────────────────────

async function createStandard(scope, data) {
  const exists = await standards().findOne(scope, { name: data.name });
  if (exists) throw new ConflictError(`"${data.name}" already exists`);
  return standards().create(scope, data);
}

/**
 * A standard cannot be deleted while students are enrolled in any of its groups —
 * "cannot delete a class containing students; must promote/transfer first" (Plan.docx §9).
 */
async function deleteStandard(scope, standardId) {
  const Enrolment = mongoose.model('Enrolment');
  const groupIds = (await groups().find(scope, { standardId }, { select: '_id', lean: true })).map((g) => g._id);

  if (groupIds.length) {
    const enrolled = await Enrolment.countDocuments({
      tenantId: scope.tenantId,
      academicGroupId: { $in: groupIds },
      status: 'active',
      deletedAt: null,
    });
    if (enrolled > 0) {
      throw new BusinessRuleError(
        `Cannot delete: ${enrolled} student(s) are still enrolled. Promote or transfer them first.`,
      );
    }
  }

  return standards().remove(scope, standardId);
}

// ── Academic groups (sections and batches) ───────────────────────────────────

/**
 * Section names are stored uppercase (the model's pre-save hook enforces it). Normalise
 * BEFORE building the display name, or the two disagree — "Class 8 — Alpha" against a
 * stored name of "ALPHA".
 */
function normaliseGroupName(kind, name) {
  return kind === 'section' ? String(name).trim().toUpperCase() : String(name).trim();
}

/** Build the human label once, so lists do not need a join. */
async function buildDisplayName(scope, { kind, standardId, courseId, name }) {
  if (kind === 'section' && standardId) {
    const std = await standards().findById(scope, standardId, { select: 'name', lean: true });
    return std ? `${std.name} — ${name}` : name;
  }
  if (kind === 'batch' && courseId) {
    const course = await courses().findById(scope, courseId, { select: 'name', lean: true });
    return course ? `${course.name} — ${name}` : name;
  }
  return name;
}

async function createGroup(scope, data) {
  const ay = data.academicYearId ? { _id: data.academicYearId } : await requireActiveYear(scope);

  if (data.kind === 'section' && !data.standardId) {
    throw new BusinessRuleError('A section must belong to a class');
  }
  if (data.kind === 'batch' && !data.courseId) {
    throw new BusinessRuleError('A batch must belong to a course');
  }

  const name = normaliseGroupName(data.kind, data.name);
  const payload = {
    ...data,
    name,
    academicYearId: ay._id,
    displayName: await buildDisplayName(scope, { ...data, name }),
  };

  const duplicate = await groups().findOne(scope, {
    academicYearId: ay._id,
    kind: data.kind,
    standardId: data.standardId ?? null,
    courseId: data.courseId ?? null,
    name,
  });
  if (duplicate) throw new ConflictError(`"${payload.displayName}" already exists`);

  return groups().create(scope, payload);
}

/**
 * Renaming is now safe — attendance, marks and timetable reference the group id, not the
 * name. Under the old embedded-division design this orphaned every historical record.
 */
async function renameGroup(scope, groupId, rawName) {
  const group = await groups().findByIdOrFail(scope, groupId);
  const name = normaliseGroupName(group.kind, rawName);
  group.name = name;
  group.displayName = await buildDisplayName(scope, {
    kind: group.kind,
    standardId: group.standardId,
    courseId: group.courseId,
    name,
  });
  await group.save();
  return group;
}

async function deleteGroup(scope, groupId) {
  const Enrolment = mongoose.model('Enrolment');
  const enrolled = await Enrolment.countDocuments({
    tenantId: scope.tenantId,
    academicGroupId: groupId,
    status: 'active',
    deletedAt: null,
  });
  if (enrolled > 0) {
    throw new BusinessRuleError(`Cannot delete: ${enrolled} student(s) are still enrolled`);
  }
  return groups().remove(scope, groupId);
}

async function listGroups(scope, filters = {}) {
  const criteria = {};
  if (filters.kind) criteria.kind = filters.kind;
  if (filters.standardId) criteria.standardId = filters.standardId;
  if (filters.courseId) criteria.courseId = filters.courseId;
  if (filters.academicYearId) criteria.academicYearId = filters.academicYearId;
  if (filters.isActive !== undefined) criteria.isActive = filters.isActive;

  return groups().find(scope, criteria, {
    sort: { displayName: 1 },
    populate: [
      { path: 'standardId', select: 'name order' },
      { path: 'courseId', select: 'name code' },
      { path: 'inchargeId', select: 'name email' },
    ],
  });
}

/** Resolve a group by id, or by the legacy standard+division pair. */
async function resolveGroup(scope, { academicGroupId, standardId, divisionName, academicYearId }) {
  if (academicGroupId) return groups().findByIdOrFail(scope, academicGroupId);

  if (standardId && divisionName) {
    const ay = academicYearId ? { _id: academicYearId } : await requireActiveYear(scope);
    const group = await groups().findOne(scope, {
      standardId,
      name: String(divisionName).trim().toUpperCase(),
      academicYearId: ay._id,
    });
    if (!group) throw new NotFoundError(`Section "${divisionName}" not found for that class`);
    return group;
  }

  throw new BusinessRuleError('Provide either academicGroupId, or both class and section');
}

// ── Subjects & departments ───────────────────────────────────────────────────

async function createSubject(scope, data) {
  const exists = await subjects().findOne(scope, { name: data.name });
  if (exists) throw new ConflictError(`Subject "${data.name}" already exists`);
  return subjects().create(scope, data);
}

async function createDepartment(scope, data) {
  const exists = await departments().findOne(scope, { name: data.name });
  if (exists) throw new ConflictError(`Department "${data.name}" already exists`);
  return departments().create(scope, data);
}

// ── Setup progress ───────────────────────────────────────────────────────────

/**
 * What the school still has to configure. Drives the setup banner
 * (`frontend/src/components/academics/SetupFlowBanner.tsx`).
 */
async function setupStatus(scope) {
  const [yearCount, standardCount, groupCount, subjectCount, studentCount] = await Promise.all([
    years().count(scope),
    standards().count(scope),
    groups().count(scope),
    subjects().count(scope),
    mongoose.model('Student').countDocuments({ tenantId: scope.tenantId, deletedAt: null }),
  ]);

  const steps = [
    { key: 'academic_year', label: 'Academic Year', done: yearCount > 0, route: '/academics/years' },
    { key: 'classes', label: 'Classes', done: standardCount > 0, route: '/academics/standards' },
    { key: 'sections', label: 'Sections / Batches', done: groupCount > 0, route: '/academics/standards' },
    { key: 'subjects', label: 'Subjects', done: subjectCount > 0, route: '/academics/subjects' },
    { key: 'students', label: 'Students', done: studentCount > 0, route: '/students' },
  ];

  return {
    steps,
    complete: steps.every((s) => s.done),
    nextStep: steps.find((s) => !s.done) ?? null,
  };
}

module.exports = {
  activeYear,
  requireActiveYear,
  createYear,
  activateYear,
  createStandard,
  deleteStandard,
  createGroup,
  renameGroup,
  deleteGroup,
  listGroups,
  resolveGroup,
  createSubject,
  createDepartment,
  setupStatus,
  repos: { years, standards, courses, groups, subjects, departments },
};
