/**
 * Academics HTTP layer — thin by design (architecture §3.1).
 * Parse, delegate to the service, send the envelope. No business rules here.
 */
const svc = require('./academic.service');
const enrolmentSvc = require('./enrolment.service');
const { sendSuccess, sendCreated, buildPaginationMeta, parsePagination } = require('../../shared/response');
const { record } = require('../../platform/audit/auditLogger');

// ── Academic years ───────────────────────────────────────────────────────────
exports.listYears = async (req, res) => {
  const items = await svc.repos.years().find(req.scope, {}, { sort: { startDate: -1 } });
  sendSuccess(res, items);
};

exports.createYear = async (req, res) => {
  sendCreated(res, await svc.createYear(req.scope, req.body), 'Academic year created');
};

exports.activateYear = async (req, res) => {
  sendSuccess(res, await svc.activateYear(req.scope, req.params.id), 'Academic year activated');
};

// ── Standards ────────────────────────────────────────────────────────────────
exports.listStandards = async (req, res) => {
  const items = await svc.repos.standards().find(req.scope, {}, { sort: { order: 1 } });
  sendSuccess(res, items);
};

exports.createStandard = async (req, res) => {
  sendCreated(res, await svc.createStandard(req.scope, req.body), 'Class created');
};

exports.updateStandard = async (req, res) => {
  const before = await svc.repos.standards().findByIdOrFail(req.scope, req.params.id, { lean: true });
  const after = await svc.repos.standards().updateByIdOrFail(req.scope, req.params.id, req.body);
  record({ req, module: 'academics', action: 'edit', resourceType: 'Standard', resourceId: after._id, before, after });
  sendSuccess(res, after, 'Class updated');
};

exports.deleteStandard = async (req, res) => {
  await svc.deleteStandard(req.scope, req.params.id);
  sendSuccess(res, null, 'Class deleted');
};

// ── Courses (coaching) ───────────────────────────────────────────────────────
exports.listCourses = async (req, res) => {
  sendSuccess(res, await svc.repos.courses().find(req.scope, {}, { sort: { name: 1 } }));
};

exports.createCourse = async (req, res) => {
  sendCreated(res, await svc.repos.courses().create(req.scope, req.body), 'Course created');
};

// ── Academic groups (sections / batches) ─────────────────────────────────────
exports.listGroups = async (req, res) => {
  sendSuccess(res, await svc.listGroups(req.scope, req.query));
};

exports.createGroup = async (req, res) => {
  const label = req.body.kind === 'batch' ? 'Batch' : 'Section';
  sendCreated(res, await svc.createGroup(req.scope, req.body), `${label} created`);
};

exports.renameGroup = async (req, res) => {
  const before = await svc.repos.groups().findByIdOrFail(req.scope, req.params.id, { lean: true });
  const after = await svc.renameGroup(req.scope, req.params.id, req.body.name);
  record({ req, module: 'academics', action: 'edit', resourceType: 'AcademicGroup', resourceId: after._id, before, after });
  sendSuccess(res, after, 'Renamed');
};

exports.deleteGroup = async (req, res) => {
  await svc.deleteGroup(req.scope, req.params.id);
  sendSuccess(res, null, 'Deleted');
};

exports.groupRoster = async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const Enrolment = require('mongoose').model('Enrolment');
  const { repo } = require('../../infra/repository/BaseRepository');
  const enrolments = repo(Enrolment);

  const criteria = { academicGroupId: req.params.id, status: 'active' };
  const [items, total] = await Promise.all([
    enrolments.find(req.scope, criteria, {
      skip,
      limit,
      sort: { rollNo: 1 },
      populate: { path: 'studentId', select: 'name admissionNo rollNo photo gender status' },
    }),
    enrolments.count(req.scope, criteria),
  ]);

  sendSuccess(res, items, null, 200, buildPaginationMeta(total, page, limit));
};

// ── Subjects & departments ───────────────────────────────────────────────────
exports.listSubjects = async (req, res) => {
  sendSuccess(res, await svc.repos.subjects().find(req.scope, {}, { sort: { name: 1 } }));
};

exports.createSubject = async (req, res) => {
  sendCreated(res, await svc.createSubject(req.scope, req.body), 'Subject created');
};

exports.updateSubject = async (req, res) => {
  sendSuccess(res, await svc.repos.subjects().updateByIdOrFail(req.scope, req.params.id, req.body), 'Subject updated');
};

exports.deleteSubject = async (req, res) => {
  await svc.repos.subjects().remove(req.scope, req.params.id);
  sendSuccess(res, null, 'Subject deleted');
};

exports.listDepartments = async (req, res) => {
  sendSuccess(res, await svc.repos.departments().find(req.scope, {}, { sort: { name: 1 } }));
};

exports.createDepartment = async (req, res) => {
  sendCreated(res, await svc.createDepartment(req.scope, req.body), 'Department created');
};

// ── Enrolment ────────────────────────────────────────────────────────────────
exports.enrol = async (req, res) => {
  sendCreated(res, await enrolmentSvc.enrol(req.scope, req.body, { req }), 'Student enrolled');
};

exports.transfer = async (req, res) => {
  sendSuccess(res, await enrolmentSvc.transfer(req.scope, req.body, { req }), 'Student transferred');
};

exports.promote = async (req, res) => {
  const result = await enrolmentSvc.promoteMany(req.scope, req.body, { req });
  const message = `${result.promoted.length} promoted, ${result.detained.length} detained, ${result.failed.length} failed`;
  sendSuccess(res, result, message);
};

exports.studentEnrolment = async (req, res) => {
  sendSuccess(res, await enrolmentSvc.current(req.scope, req.params.studentId));
};

exports.studentEnrolmentHistory = async (req, res) => {
  sendSuccess(res, await enrolmentSvc.history(req.scope, req.params.studentId));
};

// ── Setup ────────────────────────────────────────────────────────────────────
exports.setupStatus = async (req, res) => {
  sendSuccess(res, await svc.setupStatus(req.scope));
};
