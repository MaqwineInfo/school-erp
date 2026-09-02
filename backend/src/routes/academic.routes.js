const router = require('express').Router();
const AcademicYear = require('../models/AcademicYear');
const Standard = require('../models/Standard');
const Subject = require('../models/Subject');
const Student = require('../models/Student');
const Timetable = require('../models/Timetable');
const Homework = require('../models/Homework');
const { authenticate } = require('../middleware/auth');
const { checkPermission } = require('../middleware/rbac');
const { AppError } = require('../shared/errors');
const { sendSuccess } = require('../shared/response');
const { getStandardOrThrow, syncDivisionStrength, normalizeDivisionName, assertClassSectionExists } = require('../services/academic.service');

router.use(authenticate);

// Academic Years
router.get('/years', checkPermission('academics', 'view'), async (req, res) => {
  const years = await AcademicYear.find({ tenantId: req.tenantId, deletedAt: null }).sort({ startDate: -1 });
  sendSuccess(res, years);
});

router.post('/years', checkPermission('academics', 'edit'), async (req, res) => {
  const year = await AcademicYear.create({ ...req.body, tenantId: req.tenantId });
  sendSuccess(res, year, 'Academic year created', 201);
});

router.put('/years/:id', checkPermission('academics', 'edit'), async (req, res) => {
  const year = await AcademicYear.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.tenantId },
    { $set: req.body },
    { new: true }
  );
  if (!year) throw new AppError('Academic year not found', 404);
  sendSuccess(res, year, 'Updated');
});

router.patch('/years/:id/activate', checkPermission('academics', 'edit'), async (req, res) => {
  await AcademicYear.updateMany({ tenantId: req.tenantId }, { $set: { isActive: false } });
  const year = await AcademicYear.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.tenantId },
    { $set: { isActive: true } },
    { new: true }
  );
  if (!year) throw new AppError('Academic year not found', 404);
  sendSuccess(res, year, 'Academic year activated');
});

// Standards (Classes / Grades)
router.get('/standards', checkPermission('academics', 'view'), async (req, res) => {
  const standards = await Standard.find({ tenantId: req.tenantId, isActive: true, deletedAt: null }).sort({ order: 1 });

  const counts = await Student.aggregate([
    {
      $match: {
        tenantId: req.tenantId,
        deletedAt: null,
        status: 'active',
        standardId: { $in: standards.map((s) => s._id) },
      },
    },
    { $group: { _id: { standardId: '$standardId', divisionName: '$divisionName' }, count: { $sum: 1 } } },
  ]);

  const countMap = {};
  counts.forEach((c) => {
    const key = `${c._id.standardId}:${c._id.divisionName}`;
    countMap[key] = c.count;
  });

  const enriched = standards.map((std) => {
    const doc = std.toObject();
    doc.divisions = doc.divisions.map((div) => ({
      ...div,
      strength: countMap[`${std._id}:${div.name}`] || 0,
    }));
    doc.totalStudents = doc.divisions.reduce((sum, d) => sum + (d.strength || 0), 0);
    return doc;
  });

  sendSuccess(res, enriched);
});

router.post('/standards', checkPermission('academics', 'edit'), async (req, res) => {
  const { name, order, stage, divisions = [], shortName } = req.body;
  if (!name?.trim()) throw new AppError('Standard name is required', 400);

  const normalizedDivisions = (divisions.length ? divisions : [{ name: 'A' }]).map((d) => ({
    name: (typeof d === 'string' ? d : d.name).trim().toUpperCase(),
    strength: 0,
    classTeacherId: d.classTeacherId,
  }));

  const uniqueNames = new Set(normalizedDivisions.map((d) => d.name));
  if (uniqueNames.size !== normalizedDivisions.length) {
    throw new AppError('Duplicate division names are not allowed', 400);
  }

  const std = await Standard.create({
    name: name.trim(),
    shortName,
    order: order ?? 1,
    stage: stage || 'primary',
    divisions: normalizedDivisions,
    tenantId: req.tenantId,
  });
  sendSuccess(res, std, 'Standard created', 201);
});

router.put('/standards/:id', checkPermission('academics', 'edit'), async (req, res) => {
  const std = await getStandardOrThrow(req.tenantId, req.params.id);
  const { name, order, stage, shortName, streams, isActive } = req.body;

  if (name !== undefined) std.name = name.trim();
  if (order !== undefined) std.order = order;
  if (stage !== undefined) std.stage = stage;
  if (shortName !== undefined) std.shortName = shortName;
  if (streams !== undefined) std.streams = streams;
  if (isActive !== undefined) std.isActive = isActive;

  await std.save();
  await syncDivisionStrength(req.tenantId, std._id);
  sendSuccess(res, std, 'Updated');
});

router.delete('/standards/:id', checkPermission('academics', 'delete'), async (req, res) => {
  const std = await getStandardOrThrow(req.tenantId, req.params.id);
  const studentCount = await Student.countDocuments({
    tenantId: req.tenantId,
    standardId: std._id,
    deletedAt: null,
    status: 'active',
  });
  if (studentCount > 0) {
    throw new AppError(`Cannot delete ${std.name}: ${studentCount} active student(s) assigned`, 409);
  }

  std.deletedAt = new Date();
  std.isActive = false;
  await std.save();
  sendSuccess(res, null, 'Deleted');
});

router.post('/standards/:id/divisions', checkPermission('academics', 'edit'), async (req, res) => {
  const std = await getStandardOrThrow(req.tenantId, req.params.id);
  const name = (req.body.name || '').trim().toUpperCase();
  if (!name) throw new AppError('Division name is required', 400);
  if (std.divisions.some((d) => d.name === name)) {
    throw new AppError(`Division "${name}" already exists in ${std.name}`, 409);
  }

  std.divisions.push({ name, strength: 0, maxCapacity: req.body.maxCapacity || 40, classTeacherId: req.body.classTeacherId });
  await std.save();
  sendSuccess(res, std, 'Division added', 201);
});

router.delete('/standards/:id/divisions/:divisionName', checkPermission('academics', 'edit'), async (req, res) => {
  const std = await getStandardOrThrow(req.tenantId, req.params.id);
  const divisionName = decodeURIComponent(req.params.divisionName).toUpperCase();

  const studentCount = await Student.countDocuments({
    tenantId: req.tenantId,
    standardId: std._id,
    divisionName,
    deletedAt: null,
    status: 'active',
  });
  if (studentCount > 0) {
    throw new AppError(`Cannot remove section ${divisionName}: ${studentCount} student(s) assigned`, 409);
  }

  std.divisions = std.divisions.filter((d) => d.name !== divisionName);
  if (std.divisions.length === 0) {
    throw new AppError('A class must have at least one section', 400);
  }
  await std.save();
  sendSuccess(res, std, 'Section removed');
});

router.patch('/standards/:id/divisions/:divisionName', checkPermission('academics', 'edit'), async (req, res) => {
  const std = await getStandardOrThrow(req.tenantId, req.params.id);
  const divisionName = decodeURIComponent(req.params.divisionName).toUpperCase();
  const div = std.divisions.find((d) => d.name === divisionName);
  if (!div) throw new AppError(`Section ${divisionName} not found`, 404);

  if (req.body.maxCapacity !== undefined) div.maxCapacity = req.body.maxCapacity;
  if (req.body.classTeacherId !== undefined) div.classTeacherId = req.body.classTeacherId;
  await std.save();
  sendSuccess(res, std, 'Section updated');
});

// Subjects
router.get('/subjects', checkPermission('academics', 'view'), async (req, res) => {
  const subjects = await Subject.find({ tenantId: req.tenantId, isActive: true, deletedAt: null }).sort({ name: 1 });
  sendSuccess(res, subjects);
});

router.post('/subjects', checkPermission('academics', 'edit'), async (req, res) => {
  const sub = await Subject.create({ ...req.body, tenantId: req.tenantId });
  sendSuccess(res, sub, 'Subject created', 201);
});

router.put('/subjects/:id', checkPermission('academics', 'edit'), async (req, res) => {
  const sub = await Subject.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.tenantId },
    { $set: req.body },
    { new: true }
  );
  if (!sub) throw new AppError('Subject not found', 404);
  sendSuccess(res, sub, 'Updated');
});

router.delete('/subjects/:id', checkPermission('academics', 'delete'), async (req, res) => {
  await Subject.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.tenantId },
    { $set: { deletedAt: new Date(), isActive: false } }
  );
  sendSuccess(res, null, 'Deleted');
});

// Timetable
router.get('/timetable', checkPermission('timetable', 'view'), async (req, res) => {
  const { standardId, divisionName, academicYearId } = req.query;
  const filter = { tenantId: req.tenantId };
  if (standardId) filter.standardId = standardId;
  if (divisionName) filter.divisionName = normalizeDivisionName(divisionName);
  if (academicYearId) filter.academicYearId = academicYearId;
  const tt = await Timetable.findOne(filter)
    .populate('slots.subjectId', 'name')
    .populate('slots.teacherId', 'name');
  sendSuccess(res, tt);
});

router.post('/timetable', checkPermission('timetable', 'edit'), async (req, res) => {
  const { academicYearId, standardId, divisionName } = req.body;
  const { divisionName: normalized } = await assertClassSectionExists(req.tenantId, standardId, divisionName);
  const existing = await Timetable.findOne({ tenantId: req.tenantId, academicYearId, standardId, divisionName: normalized });
  if (existing) {
    existing.slots = req.body.slots;
    await existing.save();
    return sendSuccess(res, existing, 'Timetable updated');
  }
  const tt = await Timetable.create({ ...req.body, divisionName: normalized, tenantId: req.tenantId, branchId: req.user.branchId });
  sendSuccess(res, tt, 'Timetable created', 201);
});

// Homework
router.get('/homework', checkPermission('homework', 'view'), async (req, res) => {
  const { standardId, divisionName, subjectId, type } = req.query;
  const filter = { tenantId: req.tenantId, isActive: true, deletedAt: null };
  if (standardId) filter.standardId = standardId;
  if (divisionName) filter.divisionName = normalizeDivisionName(divisionName);
  if (subjectId) filter.subjectId = subjectId;
  if (type) filter.type = type;
  const homework = await Homework.find(filter)
    .populate('subjectId', 'name')
    .populate('teacherId', 'name')
    .sort({ createdAt: -1 });
  sendSuccess(res, homework);
});

router.post('/homework', checkPermission('homework', 'add'), async (req, res) => {
  const body = { ...req.body };
  if (body.standardId && body.divisionName) {
    const { divisionName } = await assertClassSectionExists(req.tenantId, body.standardId, body.divisionName);
    body.divisionName = divisionName;
  }
  const hw = await Homework.create({
    ...body,
    tenantId: req.tenantId,
    branchId: req.user.branchId,
    teacherId: req.user.userId,
  });
  sendSuccess(res, hw, 'Created', 201);
});

router.delete('/homework/:id', checkPermission('homework', 'delete'), async (req, res) => {
  await Homework.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.tenantId },
    { $set: { deletedAt: new Date() } }
  );
  sendSuccess(res, null, 'Deleted');
});

module.exports = router;
