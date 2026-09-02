/**
 * Scheduled fee jobs (architecture §13.2).
 *
 * None of these existed: there was no scheduler at all, which is why every fee reminder in
 * the workflow documents was unimplemented.
 *
 * Each job is idempotent and re-runnable, and runs under `Scope.system(reason)` so its
 * cross-tenant access is attributable.
 */
const mongoose = require('mongoose');

const { Scope } = require('../../platform/scope/scope');
const { publish } = require('../../infra/events/bus');
const { EVENTS } = require('../../infra/events/events');
const logger = require('../../config/logger');

/** Mark demands overdue once their due date has passed. */
async function markOverdue() {
  const FeeDemand = mongoose.model('FeeDemand');
  const now = new Date();

  const res = await FeeDemand.updateMany(
    { dueDate: { $lt: now }, status: { $in: ['pending', 'partial'] }, deletedAt: null },
    { $set: { status: 'overdue' } },
  );

  if (res.modifiedCount) logger.info('Fee demands marked overdue', { count: res.modifiedCount });
  return res.modifiedCount;
}

/** Accrue late fees per the structure's policy. */
async function accrueLateFees() {
  const FeeDemand = mongoose.model('FeeDemand');
  const FeeStructure = mongoose.model('FeeStructure');

  const overdue = await FeeDemand.find({
    status: 'overdue',
    deletedAt: null,
    dueDate: { $lt: new Date() },
  }).limit(1000);

  let updated = 0;

  for (const demand of overdue) {
    const structure = await FeeStructure.findById(demand.feeStructureId).select('lateFee').lean();
    if (!structure?.lateFee?.enabled) continue;

    const { mode, amount, graceDays, maxAmount } = structure.lateFee;
    const daysLate = Math.floor((Date.now() - demand.dueDate.getTime()) / 86400000) - (graceDays || 0);
    if (daysLate <= 0) continue;

    let fee = 0;
    if (mode === 'per_day') fee = amount * daysLate;
    else if (mode === 'per_month') fee = amount * Math.ceil(daysLate / 30);
    else fee = amount; // flat

    if (maxAmount > 0) fee = Math.min(fee, maxAmount);

    if (fee !== demand.lateFee) {
      demand.lateFee = fee;
      await demand.save(); // recalculate() folds it into the totals
      updated += 1;
    }
  }

  if (updated) logger.info('Late fees accrued', { count: updated });
  return updated;
}

/**
 * Fee reminders at D-7, on the due date, and at D+3 / D+7.
 * Publishes events; the communication module decides channel and template.
 */
async function sendReminders() {
  const FeeDemand = mongoose.model('FeeDemand');

  const offsets = [-7, 0, 3, 7];
  let queued = 0;

  for (const offset of offsets) {
    const target = new Date();
    target.setHours(0, 0, 0, 0);
    target.setDate(target.getDate() - offset);
    const next = new Date(target);
    next.setDate(next.getDate() + 1);

    const due = await FeeDemand.find({
      dueDate: { $gte: target, $lt: next },
      status: { $in: ['pending', 'partial', 'overdue'] },
      totalDue: { $gt: 0 },
      deletedAt: null,
    })
      .limit(2000)
      .lean();

    for (const demand of due) {
      await publish(EVENTS.FEE_OVERDUE, {
        tenantId: demand.tenantId,
        branchId: demand.branchId,
        studentId: String(demand.studentId),
        demandId: String(demand._id),
        demandNo: demand.demandNo,
        amount: demand.totalDue,
        dueDate: demand.dueDate,
        reminderOffsetDays: offset,
      });
      queued += 1;
    }
  }

  if (queued) logger.info('Fee reminders queued', { count: queued });
  return queued;
}

const jobs = [
  {
    name: 'fees.markOverdue',
    description: 'Flag fee demands whose due date has passed',
    everyMs: 24 * 60 * 60 * 1000,
    handler: async () => {
      Scope.system('job:fees.markOverdue');
      await markOverdue();
    },
  },
  {
    name: 'fees.accrueLateFees',
    description: 'Accrue late fees per each structure’s policy',
    everyMs: 24 * 60 * 60 * 1000,
    handler: async () => {
      Scope.system('job:fees.accrueLateFees');
      await accrueLateFees();
    },
  },
  {
    name: 'fees.sendReminders',
    description: 'Queue fee reminders at D-7, due date, D+3 and D+7',
    everyMs: 24 * 60 * 60 * 1000,
    handler: async () => {
      Scope.system('job:fees.sendReminders');
      await sendReminders();
    },
  },
];

module.exports = { jobs, markOverdue, accrueLateFees, sendReminders };
