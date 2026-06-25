const Syllabus = require('../models/Syllabus');
const StudyMaterial = require('../models/StudyMaterial');
const { AppError } = require('../shared/errors');
const { sendSuccess } = require('../shared/response');

// ── Syllabus ──────────────────────────────────────────────────────────────────
exports.get = async (req, res) => {
  const { standardId, subjectId, academicYearId } = req.query;
  const s = await Syllabus.findOne({ tenantId: req.tenantId, standardId, subjectId, academicYearId, deletedAt: null })
    .populate('subjectId', 'name code').populate('standardId', 'name').populate('teacherId', 'name');
  sendSuccess(res, s || null);
};

exports.save = async (req, res) => {
  const { standardId, subjectId, academicYearId, chapters, teacherId } = req.body;
  const s = await Syllabus.findOneAndUpdate(
    { tenantId: req.tenantId, standardId, subjectId, academicYearId },
    { $set: { chapters, teacherId, tenantId: req.tenantId, branchId: req.user?.branchId } },
    { upsert: true, new: true }
  );
  sendSuccess(res, s, 'Syllabus saved');
};

exports.updateChapter = async (req, res) => {
  const { syllabusId, chapterIndex, status, completedDate, remarks } = req.body;
  const s = await Syllabus.findOneAndUpdate(
    { _id: syllabusId, tenantId: req.tenantId },
    { $set: { [`chapters.${chapterIndex}.status`]: status, [`chapters.${chapterIndex}.completedDate`]: completedDate, [`chapters.${chapterIndex}.remarks`]: remarks } },
    { new: true }
  );
  if (!s) throw new AppError('Syllabus not found', 404);
  sendSuccess(res, s, 'Chapter updated');
};

exports.list = async (req, res) => {
  const { academicYearId, standardId } = req.query;
  const filter = { tenantId: req.tenantId, deletedAt: null };
  if (academicYearId) filter.academicYearId = academicYearId;
  if (standardId) filter.standardId = standardId;
  const list = await Syllabus.find(filter).populate('subjectId', 'name code').populate('standardId', 'name').populate('teacherId', 'name');
  sendSuccess(res, list);
};

// ── Study Material ────────────────────────────────────────────────────────────
exports.listMaterials = async (req, res) => {
  const { standardId, subjectId, type } = req.query;
  const filter = { tenantId: req.tenantId, deletedAt: null };
  if (standardId) filter.standardId = standardId;
  if (subjectId) filter.subjectId = subjectId;
  if (type) filter.type = type;
  const materials = await StudyMaterial.find(filter).populate('standardId', 'name').populate('subjectId', 'name').populate('uploadedBy', 'name').sort({ createdAt: -1 });
  sendSuccess(res, materials);
};

exports.createMaterial = async (req, res) => {
  const m = await StudyMaterial.create({ ...req.body, tenantId: req.tenantId, branchId: req.user?.branchId, uploadedBy: req.user.userId });
  sendSuccess(res, m, 'Study material added', 201);
};

exports.deleteMaterial = async (req, res) => {
  await StudyMaterial.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenantId }, { $set: { deletedAt: new Date() } });
  sendSuccess(res, null, 'Study material deleted');
};
