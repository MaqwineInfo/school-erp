const Timetable = require('../models/Timetable');
const Standard = require('../models/Standard');
const { AppError } = require('../shared/errors');
const { sendSuccess } = require('../shared/response');
const { assertClassSectionExists, normalizeDivisionName } = require('../services/academic.service');

// Get timetable for a class/division
exports.get = async (req, res) => {
  const { standardId, divisionName, academicYearId } = req.query;
  if (!standardId || !divisionName) throw new AppError('Class and section are required', 400);
  const normalized = normalizeDivisionName(divisionName);

  const tt = await Timetable.findOne({
    tenantId: req.tenantId, standardId, divisionName: normalized,
    academicYearId: academicYearId || undefined,
    deletedAt: null,
  })
    .populate('slots.subjectId', 'name code')
    .populate('slots.teacherId', 'name');

  sendSuccess(res, tt || null);
};

// Get timetable for a teacher (all their slots across classes)
exports.getTeacher = async (req, res) => {
  const teacherId = req.params.teacherId || req.user.userId;
  const timetables = await Timetable.find({ tenantId: req.tenantId, 'slots.teacherId': teacherId, deletedAt: null })
    .populate('standardId', 'name shortName')
    .populate('slots.subjectId', 'name code')
    .populate('slots.teacherId', 'name');

  // Flatten into individual slots with class info
  const schedule = [];
  for (const tt of timetables) {
    for (const slot of tt.slots) {
      if (String(slot.teacherId?._id || slot.teacherId) === String(teacherId)) {
        schedule.push({ ...slot.toObject(), standardName: tt.standardId?.name, divisionName: tt.divisionName, standardId: tt.standardId });
      }
    }
  }
  sendSuccess(res, schedule);
};

// Save / overwrite full timetable for a class
exports.save = async (req, res) => {
  const { standardId, divisionName, academicYearId, slots } = req.body;
  if (!standardId || !divisionName) throw new AppError('Class and section are required', 400);
  const { divisionName: normalized } = await assertClassSectionExists(req.tenantId, standardId, divisionName);

  const tt = await Timetable.findOneAndUpdate(
    { tenantId: req.tenantId, standardId, divisionName: normalized, academicYearId },
    { $set: { slots: slots || [], isActive: true } },
    { upsert: true, new: true }
  );
  sendSuccess(res, tt, 'Timetable saved');
};

// Add / update a single slot
exports.updateSlot = async (req, res) => {
  const { standardId, divisionName, academicYearId, slot } = req.body;
  const { divisionName: normalized } = await assertClassSectionExists(req.tenantId, standardId, divisionName);

  let tt = await Timetable.findOne({ tenantId: req.tenantId, standardId, divisionName: normalized, academicYearId });
  if (!tt) {
    tt = new Timetable({ tenantId: req.tenantId, standardId, divisionName: normalized, academicYearId, slots: [] });
  }

  // Remove existing slot for same day+period, then add new one
  tt.slots = tt.slots.filter(s => !(s.dayOfWeek === slot.dayOfWeek && s.periodNo === slot.periodNo));
  if (slot.type !== 'free') tt.slots.push(slot);
  await tt.save();
  sendSuccess(res, tt, 'Slot updated');
};

// List all timetables (for dropdown)
exports.list = async (req, res) => {
  const { academicYearId } = req.query;
  const filter = { tenantId: req.tenantId, deletedAt: null };
  if (academicYearId) filter.academicYearId = academicYearId;

  const timetables = await Timetable.find(filter)
    .select('standardId divisionName isActive')
    .populate('standardId', 'name shortName');
  sendSuccess(res, timetables);
};

// Delete timetable for a class
exports.remove = async (req, res) => {
  await Timetable.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenantId }, { $set: { deletedAt: new Date() } });
  sendSuccess(res, null, 'Timetable deleted');
};
