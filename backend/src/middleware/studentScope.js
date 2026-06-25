/**
 * Apply student data scope based on logged-in role.
 * Used by student, fee, attendance, homework, marks controllers for parent/student portals.
 */
function applyStudentScope(req, filter = {}) {
  const { role, studentId, linkedStudentIds } = req.user || {};

  if (role === 'student' && studentId) {
    filter._id = studentId;
    return filter;
  }

  if (role === 'parent') {
    const ids = linkedStudentIds || [];
    filter._id = ids.length ? { $in: ids } : { $in: [] };
    return filter;
  }

  return filter;
}

/** Verify a studentId is accessible to parent/student portal users */
function assertStudentAccess(req, studentId) {
  const { role, studentId: ownId, linkedStudentIds } = req.user || {};
  if (!studentId) return;

  if (role === 'student' && ownId && String(ownId) !== String(studentId)) {
    const { AppError } = require('../shared/errors');
    throw new AppError('Access denied', 403);
  }

  if (role === 'parent') {
    const allowed = (linkedStudentIds || []).map(String);
    if (!allowed.includes(String(studentId))) {
      const { AppError } = require('../shared/errors');
      throw new AppError('Access denied', 403);
    }
  }
}

/** Scope homework/attendance queries to portal user's class(es) */
async function applyClassScopeForPortal(req, filter = {}) {
  const { role, studentId, linkedStudentIds } = req.user || {};
  if (!['parent', 'student'].includes(role)) return filter;

  const Student = require('../models/Student');
  let studentIds = [];

  if (role === 'student' && studentId) studentIds = [studentId];
  if (role === 'parent' && linkedStudentIds?.length) studentIds = linkedStudentIds;

  if (!studentIds.length) {
    filter._id = { $in: [] };
    return filter;
  }

  const students = await Student.find({ _id: { $in: studentIds }, deletedAt: null })
    .select('standardId divisionName')
    .lean();

  if (!students.length) {
    filter._id = { $in: [] };
    return filter;
  }

  if (students.length === 1) {
    filter.standardId = students[0].standardId;
    filter.divisionName = students[0].divisionName;
  } else {
    filter.$or = students.map(s => ({ standardId: s.standardId, divisionName: s.divisionName }));
  }

  return filter;
}

module.exports = { applyStudentScope, assertStudentAccess, applyClassScopeForPortal };
