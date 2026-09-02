const Tenant = require('../models/Tenant');
const Branch = require('../models/Branch');
const Standard = require('../models/Standard');
const AcademicYear = require('../models/AcademicYear');
const Enquiry = require('../models/Enquiry');
const { AppError } = require('../shared/errors');
const { sendSuccess } = require('../shared/response');
const { resolveEnquiryClassSection } = require('../services/academic.service');

async function resolveTenant(slug) {
  const tenant = await Tenant.findOne({ slug, deletedAt: null });
  if (!tenant) throw new AppError('School not found', 404);
  if (tenant.status === 'suspended') throw new AppError('This school is not accepting applications', 403);
  return tenant;
}

exports.getSchool = async (req, res) => {
  const tenant = await resolveTenant(req.params.slug);
  const activeYear = await AcademicYear.findOne({ tenantId: tenant._id, isActive: true, deletedAt: null }).select('name');

  sendSuccess(res, {
    name: tenant.name,
    slug: tenant.slug,
    logo: tenant.logo,
    primaryColor: tenant.primaryColor,
    city: tenant.city,
    state: tenant.state,
    board: tenant.board,
    activeAcademicYear: activeYear?.name || null,
  });
};

exports.getClasses = async (req, res) => {
  const tenant = await resolveTenant(req.params.slug);
  const standards = await Standard.find({
    tenantId: tenant._id,
    isActive: true,
    deletedAt: null,
  })
    .sort({ order: 1 })
    .select('name shortName divisions order stage');

  sendSuccess(res, standards);
};

exports.submitAdmission = async (req, res) => {
  const tenant = await resolveTenant(req.params.slug);
  const branch = await Branch.findOne({ tenantId: tenant._id, isHeadOffice: true });

  const body = { ...req.body };
  const { standardId, divisionName } = await resolveEnquiryClassSection(tenant._id, body, { required: true });

  const enquiry = await Enquiry.create({
    tenantId: tenant._id,
    branchId: branch?._id,
    studentName: body.studentName,
    dob: body.dob ? new Date(body.dob) : undefined,
    gender: body.gender,
    parentName: body.parentName,
    parentPhone: body.parentPhone,
    parentEmail: body.parentEmail,
    currentSchool: body.currentSchool,
    applyingForStandard: standardId,
    applyingForDivision: divisionName,
    source: body.source || 'website',
    status: body.status || 'form_submitted',
    notes: body.notes,
  });

  sendSuccess(res, { enquiryId: enquiry._id }, 'Application submitted successfully', 201);
};
