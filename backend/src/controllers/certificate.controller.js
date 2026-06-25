const Certificate = require('../models/Certificate');
const Student = require('../models/Student');
const Tenant = require('../models/Tenant');
const { AppError } = require('../shared/errors');
const { sendSuccess, buildPaginationMeta, parsePagination } = require('../shared/response');
const { generateCertificatePdf } = require('../utils/certificatePdf');

const CERT_LABELS = { bonafide: 'Bonafide Certificate', character: 'Character Certificate', conduct: 'Conduct Certificate', tc: 'Transfer Certificate', migration: 'Migration Certificate', study: 'Study Certificate', participation: 'Participation Certificate', merit: 'Merit Certificate', achievement: 'Achievement Certificate' };

exports.list = async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { type, studentId, search } = req.query;

  const filter = { tenantId: req.tenantId, deletedAt: null };
  if (type) filter.type = type;
  if (studentId) filter.studentId = studentId;

  const [items, total] = await Promise.all([
    Certificate.find(filter).populate('studentId', 'name admissionNo standardId divisionName').populate('issuedBy', 'name').sort({ issuedAt: -1 }).skip(skip).limit(limit),
    Certificate.countDocuments(filter),
  ]);
  sendSuccess(res, items, null, 200, buildPaginationMeta(total, page, limit));
};

exports.issue = async (req, res) => {
  const { studentId, type, remarks } = req.body;
  if (!studentId || !type) throw new AppError('studentId and type required', 400);

  const student = await Student.findOne({ _id: studentId, tenantId: req.tenantId });
  if (!student) throw new AppError('Student not found', 404);

  // Generate serial number
  const count = await Certificate.countDocuments({ tenantId: req.tenantId, type });
  const year = new Date().getFullYear();
  const serialNo = `${type.toUpperCase().substring(0, 3)}/${year}/${String(count + 1).padStart(4, '0')}`;
  const verificationCode = Math.random().toString(36).substring(2, 10).toUpperCase();

  const cert = await Certificate.create({
    tenantId: req.tenantId, branchId: req.user?.branchId,
    studentId, type, serialNo, remarks, verificationCode,
    issuedBy: req.user.userId, issuedAt: new Date(),
  });

  sendSuccess(res, cert, `${CERT_LABELS[type] || type} issued (${serialNo})`, 201);
};

exports.get = async (req, res) => {
  const cert = await Certificate.findOne({ _id: req.params.id, tenantId: req.tenantId, deletedAt: null })
    .populate('studentId', 'name admissionNo dob gender standardId divisionName guardians')
    .populate('issuedBy', 'name designation');
  if (!cert) throw new AppError('Certificate not found', 404);
  sendSuccess(res, cert);
};

exports.verify = async (req, res) => {
  const cert = await Certificate.findOne({ verificationCode: req.params.code })
    .populate('studentId', 'name admissionNo').populate('tenantId', 'name');
  if (!cert) throw new AppError('Certificate not found or invalid code', 404);
  sendSuccess(res, { valid: true, cert });
};

exports.revoke = async (req, res) => {
  await Certificate.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenantId }, { $set: { deletedAt: new Date() } });
  sendSuccess(res, null, 'Certificate revoked');
};
