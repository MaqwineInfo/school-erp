const Student = require('../models/Student');
const { AppError } = require('../shared/errors');
const { sendSuccess, buildPaginationMeta } = require('../shared/response');
const { applyStudentScope } = require('../middleware/studentScope');
const {
  resolveStudentClassSection,
  validateBatchAssignment,
  syncDivisionStrength,
  normalizeDivisionName,
  getActiveAcademicYear,
} = require('../services/academic.service');

exports.list = async (req, res) => {
  const { page = 1, limit = 20, search, standardId, divisionName, status = 'active', academicYearId } = req.query;
  const skip = (page - 1) * limit;
  const filter = { tenantId: req.tenantId, deletedAt: null };
  if (status) filter.status = status;
  if (standardId) filter.standardId = standardId;
  if (divisionName) filter.divisionName = normalizeDivisionName(divisionName);
  if (academicYearId) filter.academicYearId = academicYearId;
  if (search) filter.$text = { $search: search };

  applyStudentScope(req, filter);

  const [students, total] = await Promise.all([
    Student.find(filter).populate('standardId', 'name shortName').sort({ name: 1 }).skip(skip).limit(+limit),
    Student.countDocuments(filter),
  ]);

  sendSuccess(res, students, null, 200, buildPaginationMeta(total, page, limit));
};

exports.get = async (req, res) => {
  const filter = { _id: req.params.id, tenantId: req.tenantId, deletedAt: null };
  applyStudentScope(req, filter);

  const student = await Student.findOne(filter)
    .populate('standardId', 'name shortName divisions')
    .populate('academicYearId', 'name');
  if (!student) throw new AppError('Student not found', 404);
  sendSuccess(res, student);
};

exports.create = async (req, res) => {
  const body = { ...req.body };
  body.tenantId = req.tenantId;
  body.branchId = req.user.branchId;

  const exists = await Student.findOne({ admissionNo: body.admissionNo, tenantId: req.tenantId, deletedAt: null });
  if (exists) throw new AppError('Admission number already used', 409);

  const { standardId, divisionName } = await resolveStudentClassSection(req.tenantId, body, null, { required: true });

  const student = await Student.create(body);

  await syncDivisionStrength(req.tenantId, standardId);

  sendSuccess(res, student, 'Student created', 201);
};

exports.update = async (req, res) => {
  const existing = await Student.findOne({ _id: req.params.id, tenantId: req.tenantId, deletedAt: null });
  if (!existing) throw new AppError('Student not found', 404);

  const body = { ...req.body };
  const { standardId, prevStandardId } = await resolveStudentClassSection(req.tenantId, body, existing);

  Object.assign(existing, body);
  await existing.save({ runValidators: true });

  const standardsToSync = new Set([standardId, prevStandardId].filter(Boolean).map(String));
  await Promise.all([...standardsToSync].map((id) => syncDivisionStrength(req.tenantId, id)));

  sendSuccess(res, existing, 'Student updated');
};

exports.remove = async (req, res) => {
  const student = await Student.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.tenantId, deletedAt: null },
    { $set: { deletedAt: new Date(), status: 'inactive' } },
    { new: true }
  );
  if (!student) throw new AppError('Student not found', 404);

  if (student.standardId) {
    await syncDivisionStrength(req.tenantId, student.standardId);
  }

  sendSuccess(res, null, 'Student deleted');
};

exports.bulkImport = async (req, res) => {
  const { students } = req.body;
  if (!Array.isArray(students) || students.length === 0) throw new AppError('No students provided', 400);

  const standardsToSync = new Set();
  const docs = [];

  for (const s of students) {
    const doc = { ...s, tenantId: req.tenantId, branchId: req.user.branchId };
    await resolveStudentClassSection(req.tenantId, doc, null, { required: true });
    standardsToSync.add(String(doc.standardId));
    docs.push(doc);
  }

  const result = await Student.insertMany(docs, { ordered: false }).catch((err) => ({
    insertedCount: err.insertedDocs?.length || 0,
    error: err.message,
  }));

  await Promise.all([...standardsToSync].map((id) => syncDivisionStrength(req.tenantId, id)));

  sendSuccess(res, result, 'Import complete', 201);
};

exports.bulkAssignClass = async (req, res) => {
  const { studentIds, standardId, divisionName } = req.body;
  if (!Array.isArray(studentIds) || studentIds.length === 0) throw new AppError('No students selected', 400);
  if (!standardId || !divisionName) throw new AppError('Class and section are required', 400);

  const { divisionName: normalized } = await validateBatchAssignment(req.tenantId, {
    standardId,
    divisionName,
    studentIds,
  });

  const activeYear = await getActiveAcademicYear(req.tenantId);
  const prevStandards = new Set();

  const students = await Student.find({
    _id: { $in: studentIds },
    tenantId: req.tenantId,
    deletedAt: null,
  });

  for (const student of students) {
    if (student.standardId) prevStandards.add(String(student.standardId));
    student.standardId = standardId;
    student.divisionName = normalized;
    if (!student.academicYearId && activeYear) student.academicYearId = activeYear._id;
    await student.save({ runValidators: true });
  }

  const standardsToSync = new Set([...prevStandards, String(standardId)]);
  await Promise.all([...standardsToSync].map((id) => syncDivisionStrength(req.tenantId, id)));

  sendSuccess(res, { updated: students.length }, `${students.length} student(s) assigned`);
};

/** Promote / transfer students to new class+section (same validation as bulk assign) */
exports.promote = exports.bulkAssignClass;
