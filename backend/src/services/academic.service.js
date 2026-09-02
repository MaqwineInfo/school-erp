const Standard = require('../models/Standard');
const Student = require('../models/Student');
const AcademicYear = require('../models/AcademicYear');
const { AppError } = require('../shared/errors');
const { DEFAULT_SECTION_CAPACITY } = require('../constants/systemFlow');

function normalizeDivisionName(name) {
  if (name == null || name === '') return '';
  return String(name).trim().toUpperCase();
}

async function getStandardOrThrow(tenantId, standardId) {
  if (!standardId) throw new AppError('Class is required', 400);
  const std = await Standard.findOne({ _id: standardId, tenantId, deletedAt: null, isActive: true });
  if (!std) throw new AppError('Class not found', 404);
  return std;
}

function validateDivision(std, divisionName) {
  if (!divisionName) throw new AppError(`Section is required for ${std.name}`, 400);
  const exists = std.divisions.some((d) => d.name === divisionName);
  if (!exists) {
    const available = std.divisions.map((d) => d.name).join(', ') || 'none';
    throw new AppError(`Section "${divisionName}" does not exist in ${std.name}. Available: ${available}`, 400);
  }
}

async function syncDivisionStrength(tenantId, standardId) {
  if (!standardId) return;
  const std = await Standard.findOne({ _id: standardId, tenantId, deletedAt: null });
  if (!std) return;

  const counts = await Student.aggregate([
    {
      $match: {
        tenantId: std.tenantId,
        standardId: std._id,
        deletedAt: null,
        status: 'active',
      },
    },
    { $group: { _id: '$divisionName', count: { $sum: 1 } } },
  ]);

  const countMap = Object.fromEntries(counts.map((c) => [c._id, c.count]));
  std.divisions.forEach((div) => {
    div.strength = countMap[div.name] || 0;
  });
  await std.save();
}

async function getActiveAcademicYear(tenantId) {
  return AcademicYear.findOne({ tenantId, isActive: true, deletedAt: null });
}

async function getSectionCapacity(tenantId, standardId, divisionName) {
  const std = await getStandardOrThrow(tenantId, standardId);
  const div = std.divisions.find((d) => d.name === divisionName);
  return div?.maxCapacity || DEFAULT_SECTION_CAPACITY;
}

async function countActiveInSection(tenantId, standardId, divisionName, excludeIds = []) {
  const filter = {
    tenantId,
    standardId,
    divisionName,
    deletedAt: null,
    status: 'active',
  };
  if (excludeIds.length) filter._id = { $nin: excludeIds };
  return Student.countDocuments(filter);
}

/** Validates class + section exist (attendance, timetable, homework) */
async function assertClassSectionExists(tenantId, standardId, divisionName) {
  const std = await getStandardOrThrow(tenantId, standardId);
  const normalized = normalizeDivisionName(divisionName);
  validateDivision(std, normalized);
  return { standardId: std._id, divisionName: normalized, standard: std };
}

/** Validates + enforces section capacity for one new/changed student */
async function validateStudentAssignment(tenantId, { standardId, divisionName }, excludeStudentId = null) {
  const normalized = normalizeDivisionName(divisionName);
  const std = await getStandardOrThrow(tenantId, standardId);
  validateDivision(std, normalized);

  const maxCapacity = await getSectionCapacity(tenantId, standardId, normalized);
  if (maxCapacity > 0) {
    const excludeIds = excludeStudentId ? [excludeStudentId] : [];
    const count = await countActiveInSection(tenantId, standardId, normalized, excludeIds);
    if (count >= maxCapacity) {
      throw new AppError(`${std.name} Section ${normalized} is full (${maxCapacity} seats)`, 409);
    }
  }

  return { standardId: std._id, divisionName: normalized, standard: std };
}

/** Bulk assign — checks capacity for net-new assignments */
async function validateBatchAssignment(tenantId, { standardId, divisionName, studentIds }) {
  const normalized = normalizeDivisionName(divisionName);
  const std = await getStandardOrThrow(tenantId, standardId);
  validateDivision(std, normalized);

  const maxCapacity = await getSectionCapacity(tenantId, standardId, normalized);
  if (maxCapacity <= 0) return { standardId: std._id, divisionName: normalized };

  const alreadyInSection = await Student.countDocuments({
    _id: { $in: studentIds },
    tenantId,
    standardId,
    divisionName: normalized,
    deletedAt: null,
    status: 'active',
  });

  const incoming = studentIds.length - alreadyInSection;
  if (incoming <= 0) return { standardId: std._id, divisionName: normalized };

  const currentCount = await countActiveInSection(tenantId, standardId, normalized, studentIds);
  if (currentCount + incoming > maxCapacity) {
    throw new AppError(
      `${std.name} Section ${normalized} cannot fit ${incoming} more student(s). Capacity: ${maxCapacity}, available: ${maxCapacity - currentCount}`,
      409
    );
  }

  return { standardId: std._id, divisionName: normalized };
}

/**
 * Resolve class/section on student writes — both required together, always normalized.
 */
async function resolveStudentClassSection(tenantId, body, existing = null, { required = false } = {}) {
  const hasStandard = body.standardId !== undefined ? body.standardId : existing?.standardId;
  const hasDivision = body.divisionName !== undefined ? body.divisionName : existing?.divisionName;

  let standardId = hasStandard || null;
  let divisionName = hasDivision ? normalizeDivisionName(hasDivision) : (existing?.divisionName || '');

  if (body.divisionName !== undefined) body.divisionName = divisionName;

  if (required && (!standardId || !divisionName)) {
    throw new AppError('Both class and section are required for every student', 400);
  }
  if (standardId && !divisionName) throw new AppError('Section is required when class is set', 400);
  if (divisionName && !standardId) throw new AppError('Class is required when section is set', 400);

  if (standardId && divisionName) {
    await validateStudentAssignment(
      tenantId,
      { standardId, divisionName },
      existing?._id || null
    );
  }

  if (!body.academicYearId && !existing?.academicYearId) {
    const activeYear = await getActiveAcademicYear(tenantId);
    if (activeYear) body.academicYearId = activeYear._id;
  }

  return {
    standardId,
    divisionName,
    prevStandardId: existing?.standardId,
  };
}

function normalizeStandardDivisions(divisions) {
  return (divisions?.length ? divisions : ['A']).map((d) => {
    const name = normalizeDivisionName(typeof d === 'string' ? d : d.name);
    return {
      name,
      strength: 0,
      maxCapacity: typeof d === 'object' && d.maxCapacity ? d.maxCapacity : DEFAULT_SECTION_CAPACITY,
    };
  });
}

async function resolveEnquiryClassSection(tenantId, body, { required = true } = {}) {
  const standardId = body.applyingForStandard || body.standardId;
  const rawDivision = body.applyingForDivision ?? body.divisionName;
  const divisionName = rawDivision != null && rawDivision !== '' ? normalizeDivisionName(rawDivision) : '';

  if (required && (!standardId || !divisionName)) {
    throw new AppError('Both class and section are required', 400);
  }
  if (standardId && !divisionName) throw new AppError('Section is required when class is set', 400);
  if (divisionName && !standardId) throw new AppError('Class is required when section is set', 400);

  if (standardId && divisionName) {
    await assertClassSectionExists(tenantId, standardId, divisionName);
  }

  return { standardId, divisionName };
}

module.exports = {
  normalizeDivisionName,
  normalizeStandardDivisions,
  getStandardOrThrow,
  validateDivision,
  syncDivisionStrength,
  getActiveAcademicYear,
  assertClassSectionExists,
  validateStudentAssignment,
  validateBatchAssignment,
  resolveStudentClassSection,
  resolveEnquiryClassSection,
};
