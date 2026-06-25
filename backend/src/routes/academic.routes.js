const router = require('express').Router();
const AcademicYear = require('../models/AcademicYear');
const Standard = require('../models/Standard');
const Subject = require('../models/Subject');
const Timetable = require('../models/Timetable');
const Homework = require('../models/Homework');
const { authenticate } = require('../middleware/auth');
const { AppError } = require('../shared/errors');
const { sendSuccess } = require('../shared/response');

router.use(authenticate);

// Academic Years
router.get('/years', async (req, res) => {
  const years = await AcademicYear.find({ tenantId: req.tenantId, deletedAt: null }).sort({ startDate: -1 });
  sendSuccess(res, years);
});
router.post('/years', async (req, res) => {
  const year = await AcademicYear.create({ ...req.body, tenantId: req.tenantId });
  sendSuccess(res, year, 'Academic year created', 201);
});
router.put('/years/:id', async (req, res) => {
  const year = await AcademicYear.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenantId }, { $set: req.body }, { new: true });
  if (!year) throw new AppError('Academic year not found', 404);
  sendSuccess(res, year, 'Updated');
});
router.patch('/years/:id/activate', async (req, res) => {
  await AcademicYear.updateMany({ tenantId: req.tenantId }, { $set: { isActive: false } });
  const year = await AcademicYear.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenantId }, { $set: { isActive: true } }, { new: true });
  sendSuccess(res, year, 'Academic year activated');
});

// Standards
router.get('/standards', async (req, res) => {
  const standards = await Standard.find({ tenantId: req.tenantId, isActive: true, deletedAt: null }).sort({ order: 1 });
  sendSuccess(res, standards);
});
router.post('/standards', async (req, res) => {
  const std = await Standard.create({ ...req.body, tenantId: req.tenantId });
  sendSuccess(res, std, 'Standard created', 201);
});
router.put('/standards/:id', async (req, res) => {
  const std = await Standard.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenantId }, { $set: req.body }, { new: true });
  if (!std) throw new AppError('Standard not found', 404);
  sendSuccess(res, std, 'Updated');
});
router.delete('/standards/:id', async (req, res) => {
  await Standard.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenantId }, { $set: { deletedAt: new Date(), isActive: false } });
  sendSuccess(res, null, 'Deleted');
});

// Subjects
router.get('/subjects', async (req, res) => {
  const subjects = await Subject.find({ tenantId: req.tenantId, isActive: true, deletedAt: null }).sort({ name: 1 });
  sendSuccess(res, subjects);
});
router.post('/subjects', async (req, res) => {
  const sub = await Subject.create({ ...req.body, tenantId: req.tenantId });
  sendSuccess(res, sub, 'Subject created', 201);
});
router.put('/subjects/:id', async (req, res) => {
  const sub = await Subject.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenantId }, { $set: req.body }, { new: true });
  if (!sub) throw new AppError('Subject not found', 404);
  sendSuccess(res, sub, 'Updated');
});
router.delete('/subjects/:id', async (req, res) => {
  await Subject.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenantId }, { $set: { deletedAt: new Date(), isActive: false } });
  sendSuccess(res, null, 'Deleted');
});

// Timetable
router.get('/timetable', async (req, res) => {
  const { standardId, divisionName, academicYearId } = req.query;
  const filter = { tenantId: req.tenantId };
  if (standardId) filter.standardId = standardId;
  if (divisionName) filter.divisionName = divisionName;
  if (academicYearId) filter.academicYearId = academicYearId;
  const tt = await Timetable.findOne(filter)
    .populate('slots.subjectId', 'name')
    .populate('slots.teacherId', 'name');
  sendSuccess(res, tt);
});
router.post('/timetable', async (req, res) => {
  const { academicYearId, standardId, divisionName } = req.body;
  const existing = await Timetable.findOne({ tenantId: req.tenantId, academicYearId, standardId, divisionName });
  if (existing) {
    existing.slots = req.body.slots;
    await existing.save();
    return sendSuccess(res, existing, 'Timetable updated');
  }
  const tt = await Timetable.create({ ...req.body, tenantId: req.tenantId, branchId: req.user.branchId });
  sendSuccess(res, tt, 'Timetable created', 201);
});

// Homework
router.get('/homework', async (req, res) => {
  const { standardId, divisionName, subjectId, type } = req.query;
  const filter = { tenantId: req.tenantId, isActive: true, deletedAt: null };
  if (standardId) filter.standardId = standardId;
  if (divisionName) filter.divisionName = divisionName;
  if (subjectId) filter.subjectId = subjectId;
  if (type) filter.type = type;
  const homework = await Homework.find(filter).populate('subjectId', 'name').populate('teacherId', 'name').sort({ createdAt: -1 });
  sendSuccess(res, homework);
});
router.post('/homework', async (req, res) => {
  const hw = await Homework.create({ ...req.body, tenantId: req.tenantId, branchId: req.user.branchId, teacherId: req.user.userId });
  sendSuccess(res, hw, 'Created', 201);
});
router.delete('/homework/:id', async (req, res) => {
  await Homework.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenantId }, { $set: { deletedAt: new Date() } });
  sendSuccess(res, null, 'Deleted');
});

module.exports = router;
