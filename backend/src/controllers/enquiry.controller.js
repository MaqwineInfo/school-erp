const Enquiry = require('../models/Enquiry');
const Student = require('../models/Student');
const Branch = require('../models/Branch');
const { AppError } = require('../shared/errors');
const { sendSuccess, buildPaginationMeta } = require('../shared/response');
const {
  resolveEnquiryClassSection,
  validateStudentAssignment,
  syncDivisionStrength,
  getActiveAcademicYear,
  normalizeDivisionName,
} = require('../services/academic.service');

async function buildEnquiryData(tenantId, body, branchId) {
  const { standardId, divisionName } = await resolveEnquiryClassSection(tenantId, body, { required: true });
  return {
    ...body,
    applyingForStandard: standardId,
    applyingForDivision: divisionName,
    tenantId,
    branchId,
  };
}

exports.list = async (req, res) => {
  const { page = 1, limit = 20, status, search, assignedTo } = req.query;
  const skip = (page - 1) * limit;
  const filter = { tenantId: req.tenantId, deletedAt: null };
  if (status) filter.status = status;
  if (assignedTo) filter.assignedTo = assignedTo;
  if (search) filter.$or = [
    { studentName: { $regex: search, $options: 'i' } },
    { parentName: { $regex: search, $options: 'i' } },
    { parentPhone: { $regex: search, $options: 'i' } },
  ];

  const [enquiries, total] = await Promise.all([
    Enquiry.find(filter)
      .populate('assignedTo', 'name')
      .populate('applyingForStandard', 'name shortName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(+limit),
    Enquiry.countDocuments(filter),
  ]);

  sendSuccess(res, enquiries, null, 200, buildPaginationMeta(total, page, limit));
};

exports.get = async (req, res) => {
  const enquiry = await Enquiry.findOne({ _id: req.params.id, tenantId: req.tenantId, deletedAt: null })
    .populate('assignedTo', 'name email')
    .populate('applyingForStandard', 'name shortName');
  if (!enquiry) throw new AppError('Enquiry not found', 404);
  sendSuccess(res, enquiry);
};

exports.create = async (req, res) => {
  const branch = await Branch.findOne({ tenantId: req.tenantId, _id: req.user.branchId }) ||
    await Branch.findOne({ tenantId: req.tenantId, isHeadOffice: true });
  const data = await buildEnquiryData(req.tenantId, req.body, branch?._id);
  const enquiry = await Enquiry.create(data);
  sendSuccess(res, enquiry, 'Enquiry created', 201);
};

exports.update = async (req, res) => {
  const existing = await Enquiry.findOne({ _id: req.params.id, tenantId: req.tenantId, deletedAt: null });
  if (!existing) throw new AppError('Enquiry not found', 404);

  const classFieldsTouched = ['applyingForStandard', 'standardId', 'applyingForDivision', 'divisionName']
    .some((k) => req.body[k] !== undefined);

  let applyingForStandard = existing.applyingForStandard;
  let applyingForDivision = existing.applyingForDivision;

  if (classFieldsTouched) {
    const merged = {
      applyingForStandard: req.body.applyingForStandard ?? req.body.standardId ?? existing.applyingForStandard,
      applyingForDivision: req.body.applyingForDivision ?? req.body.divisionName ?? existing.applyingForDivision,
    };
    const resolved = await resolveEnquiryClassSection(req.tenantId, merged, { required: true });
    applyingForStandard = resolved.standardId;
    applyingForDivision = resolved.divisionName;
  }

  const enquiry = await Enquiry.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.tenantId, deletedAt: null },
    {
      $set: {
        ...req.body,
        applyingForStandard,
        applyingForDivision,
      },
    },
    { new: true }
  );
  sendSuccess(res, enquiry, 'Enquiry updated');
};

exports.updateStatus = async (req, res) => {
  const { status, notes } = req.body;
  const enquiry = await Enquiry.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.tenantId, deletedAt: null },
    { $set: { status, notes } },
    { new: true }
  );
  if (!enquiry) throw new AppError('Enquiry not found', 404);
  sendSuccess(res, enquiry, `Status updated to ${status}`);
};

exports.convertToStudent = async (req, res) => {
  const enquiry = await Enquiry.findOne({ _id: req.params.id, tenantId: req.tenantId, deletedAt: null });
  if (!enquiry) throw new AppError('Enquiry not found', 404);
  if (enquiry.convertedToStudentId) throw new AppError('Already converted to student', 409);

  const standardId = req.body.standardId || enquiry.applyingForStandard;
  const divisionName = req.body.divisionName || enquiry.applyingForDivision;
  if (!standardId) throw new AppError('Class is required to admit student', 400);
  if (!divisionName) throw new AppError('Section is required to admit student', 400);
  if (!req.body.admissionNo) throw new AppError('Admission number is required', 400);

  const normalized = normalizeDivisionName(divisionName);
  await validateStudentAssignment(req.tenantId, { standardId, divisionName: normalized });

  const activeYear = await getActiveAcademicYear(req.tenantId);

  const studentData = {
    tenantId: req.tenantId,
    branchId: req.user.branchId || enquiry.branchId,
    admissionNo: req.body.admissionNo,
    name: enquiry.studentName,
    dob: enquiry.dob,
    gender: enquiry.gender,
    standardId,
    divisionName: normalized,
    academicYearId: req.body.academicYearId || activeYear?._id,
    guardians: [{ relation: 'father', name: enquiry.parentName, phone: enquiry.parentPhone, email: enquiry.parentEmail }],
    admissionDate: req.body.admissionDate || new Date(),
  };

  const student = await Student.create(studentData);
  await Enquiry.findByIdAndUpdate(enquiry._id, { status: 'admitted', convertedToStudentId: student._id });
  await syncDivisionStrength(req.tenantId, standardId);

  sendSuccess(res, student, 'Enquiry converted to student', 201);
};

exports.remove = async (req, res) => {
  await Enquiry.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenantId }, { $set: { deletedAt: new Date() } });
  sendSuccess(res, null, 'Enquiry deleted');
};
