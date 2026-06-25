const Student = require('../models/Student');
const { AppError } = require('../shared/errors');
const { sendSuccess, buildPaginationMeta } = require('../shared/response');
const { applyStudentScope } = require('../middleware/studentScope');

exports.list = async (req, res) => {
  const { page = 1, limit = 20, search, standardId, divisionName, status = 'active', academicYearId } = req.query;
  const skip = (page - 1) * limit;
  const filter = { tenantId: req.tenantId, deletedAt: null };
  if (status) filter.status = status;
  if (standardId) filter.standardId = standardId;
  if (divisionName) filter.divisionName = divisionName;
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
    .populate('standardId', 'name shortName')
    .populate('academicYearId', 'name');
  if (!student) throw new AppError('Student not found', 404);
  sendSuccess(res, student);
};

exports.create = async (req, res) => {
  const body = req.body;
  body.tenantId = req.tenantId;
  body.branchId = req.user.branchId;

  const exists = await Student.findOne({ admissionNo: body.admissionNo, tenantId: req.tenantId, deletedAt: null });
  if (exists) throw new AppError('Admission number already used', 409);

  const student = await Student.create(body);
  sendSuccess(res, student, 'Student created', 201);
};

exports.update = async (req, res) => {
  const student = await Student.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.tenantId, deletedAt: null },
    { $set: req.body },
    { new: true, runValidators: true }
  );
  if (!student) throw new AppError('Student not found', 404);
  sendSuccess(res, student, 'Student updated');
};

exports.remove = async (req, res) => {
  const student = await Student.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.tenantId, deletedAt: null },
    { $set: { deletedAt: new Date(), status: 'inactive' } }
  );
  if (!student) throw new AppError('Student not found', 404);
  sendSuccess(res, null, 'Student deleted');
};

exports.bulkImport = async (req, res) => {
  const { students } = req.body;
  if (!Array.isArray(students) || students.length === 0) throw new AppError('No students provided', 400);
  const docs = students.map(s => ({ ...s, tenantId: req.tenantId, branchId: req.user.branchId }));
  const result = await Student.insertMany(docs, { ordered: false }).catch(err => ({ insertedCount: 0, error: err.message }));
  sendSuccess(res, result, 'Import complete', 201);
};
