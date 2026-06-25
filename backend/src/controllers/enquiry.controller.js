const Enquiry = require('../models/Enquiry');
const Student = require('../models/Student');
const { AppError } = require('../shared/errors');
const { sendSuccess, buildPaginationMeta } = require('../shared/response');

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
    Enquiry.find(filter).populate('assignedTo', 'name').populate('applyingForStandard', 'name').sort({ createdAt: -1 }).skip(skip).limit(+limit),
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
  const enquiry = await Enquiry.create({ ...req.body, tenantId: req.tenantId, branchId: req.user.branchId });
  sendSuccess(res, enquiry, 'Enquiry created', 201);
};

exports.update = async (req, res) => {
  const enquiry = await Enquiry.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.tenantId, deletedAt: null },
    { $set: req.body },
    { new: true }
  );
  if (!enquiry) throw new AppError('Enquiry not found', 404);
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

  const studentData = {
    tenantId: req.tenantId,
    branchId: req.user.branchId || enquiry.branchId,
    admissionNo: req.body.admissionNo,
    name: enquiry.studentName,
    dob: enquiry.dob,
    gender: enquiry.gender,
    standardId: enquiry.applyingForStandard,
    guardians: [{ relation: 'father', name: enquiry.parentName, phone: enquiry.parentPhone, email: enquiry.parentEmail }],
    ...req.body,
  };

  const student = await Student.create(studentData);
  await Enquiry.findByIdAndUpdate(enquiry._id, { status: 'admitted', convertedToStudentId: student._id });

  sendSuccess(res, student, 'Enquiry converted to student', 201);
};

exports.remove = async (req, res) => {
  await Enquiry.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenantId }, { $set: { deletedAt: new Date() } });
  sendSuccess(res, null, 'Enquiry deleted');
};
