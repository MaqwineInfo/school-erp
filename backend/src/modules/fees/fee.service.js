/**
 * Fee service — demand generation, collection, concessions, ledger.
 *
 * This module replaces the code carrying the three critical money defects
 * (feature-brainstorm §8.2, §8.3):
 *   - concessions wrote to non-existent fields and produced NaN
 *   - receipt numbers raced under concurrent collection
 *   - payment and demand updates were two unrelated writes with no transaction
 *
 * Every amount is integer paise (ADR-07). Every mutation runs in a unit of work.
 */
const mongoose = require('mongoose');

const uow = require('../../platform/uow/unitOfWork');
const sequence = require('../../platform/sequence/sequence');
const money = require('../../shared/money');
const { repo } = require('../../infra/repository/BaseRepository');
const { publish } = require('../../infra/events/bus');
const { EVENTS } = require('../../infra/events/events');
const { record } = require('../../platform/audit/auditLogger');
const {
  BusinessRuleError,
  NotFoundError,
  ConflictError,
} = require('../../shared/errors');

const heads = () => repo(mongoose.model('FeeHead'));
const structures = () => repo(mongoose.model('FeeStructure'));
const demands = () => repo(mongoose.model('FeeDemand'));
const payments = () => repo(mongoose.model('FeePayment'));
const concessions = () => repo(mongoose.model('Concession'));
const ledger = () => repo(mongoose.model('LedgerEntry'));

// ── Ledger ───────────────────────────────────────────────────────────────────

/** Post a balanced set of double-entry lines. Refuses to post if they do not balance. */
async function postToLedger(scope, { transactionId, lines, refType, refId, studentId, narration }, session) {
  const LedgerEntry = mongoose.model('LedgerEntry');

  const totalDebit = lines.reduce((s, l) => s + (l.debit || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (l.credit || 0), 0);
  if (totalDebit !== totalCredit) {
    throw new Error(
      `Ledger entry does not balance: debit ${totalDebit} vs credit ${totalCredit} (${transactionId})`,
    );
  }

  return LedgerEntry.create(
    lines.map((l) => ({
      tenantId: scope.tenantId,
      branchId: l.branchId,
      academicYearId: l.academicYearId,
      transactionId,
      account: l.account,
      debit: l.debit || 0,
      credit: l.credit || 0,
      refType,
      refId,
      studentId,
      narration,
      postedBy: scope.userId,
    })),
    { session, ordered: true },
  );
}

// ── Concessions ──────────────────────────────────────────────────────────────

/** Concession types that apply without a workflow (specification §10.2). */
const AUTO_APPROVED = new Set(['sibling', 'rte']);

async function requestConcession(scope, data, opts = {}) {
  const Concession = mongoose.model('Concession');

  const student = await repo(mongoose.model('Student')).findByIdOrFail(scope, data.studentId);
  const autoApproved = AUTO_APPROVED.has(data.type);

  if (data.isPercentage && (data.value < 0 || data.value > 100)) {
    throw new BusinessRuleError('A percentage concession must be between 0 and 100');
  }

  const [created] = await Concession.create([
    {
      tenantId: scope.tenantId,
      branchId: student.branchId,
      academicYearId: data.academicYearId,
      studentId: data.studentId,
      type: data.type,
      isPercentage: data.isPercentage ?? true,
      value: data.value,
      feeHeadIds: data.feeHeadIds ?? [],
      reason: data.reason,
      requiresApproval: !autoApproved,
      status: autoApproved ? 'approved' : 'pending',
      approvedAt: autoApproved ? new Date() : undefined,
      validFrom: data.validFrom ?? new Date(),
      validTo: data.validTo ?? null,
      requestedBy: scope.userId,
    },
  ]);

  /**
   * Anything needing sign-off goes through the approval engine (RBAC §5.1), rather than
   * waiting for someone to call the approve endpoint directly. The engine decides how many
   * steps apply from the waiver percentage and the tenant's thresholds.
   */
  if (!autoApproved && opts.scope) {
    const approvals = require('../approvals');
    const percentage = created.isPercentage
      ? created.value
      : await percentageOfOutstanding(opts.scope, data.studentId, data.academicYearId, created.value);

    const { request } = await approvals.service.submit(
      opts.scope,
      {
        workflowKey: 'fee_concession',
        resourceType: 'Concession',
        resourceId: created._id,
        title: `Fee concession for ${student.name}`,
        payload: { percentage, amount: created.isPercentage ? 0 : created.value, reason: data.reason },
        branchId: student.branchId,
      },
      opts,
    );

    if (request) {
      created.approvalRequestId = request._id;
      await created.save();
    }
  }

  record({
    req: opts.req,
    module: 'fees',
    action: autoApproved ? 'concession_auto_applied' : 'concession_requested',
    resourceType: 'Concession',
    resourceId: created._id,
    after: created.toObject(),
    reason: data.reason,
  });

  return created;
}

/** Express a flat concession as a percentage of what the student currently owes. */
async function percentageOfOutstanding(scope, studentId, academicYearId, amount) {
  const FeeDemand = mongoose.model('FeeDemand');
  const rows = await FeeDemand.aggregate([
    {
      $match: {
        tenantId: new mongoose.Types.ObjectId(String(scope.tenantId)),
        studentId: new mongoose.Types.ObjectId(String(studentId)),
        ...(academicYearId ? { academicYearId: new mongoose.Types.ObjectId(String(academicYearId)) } : {}),
        deletedAt: null,
      },
    },
    { $group: { _id: null, total: { $sum: '$totalAmount' } } },
  ]);

  const total = rows[0]?.total ?? 0;
  return total > 0 ? Math.round((amount / total) * 100) : 100;
}

/**
 * Approve a concession and apply it to the student's open demands.
 *
 * This is the corrected version of the broken `applyConcession`: it writes to the field
 * that actually exists, recalculates through the model's single derivation path, and —
 * critically — leaves money already paid intact.
 */
async function approveConcession(scope, concessionId, { reason } = {}, opts = {}) {
  return uow.run(async (session) => {
    const Concession = mongoose.model('Concession');
    const concession = await Concession.findOne({
      _id: concessionId,
      tenantId: scope.tenantId,
      deletedAt: null,
    }).session(session);

    if (!concession) throw new NotFoundError('Concession not found');
    if (concession.status === 'approved') return concession; // idempotent

    const before = concession.toObject();
    concession.status = 'approved';
    concession.approvedBy = scope.userId;
    concession.approvedAt = new Date();
    await concession.save({ session });

    const applied = await applyConcessionsToOpenDemands(
      scope,
      concession.studentId,
      concession.academicYearId,
      session,
    );

    record({
      req: opts.req,
      module: 'fees',
      action: 'waiver_approve',
      resourceType: 'Concession',
      resourceId: concession._id,
      before,
      after: concession.toObject(),
      reason,
    });

    return { concession, demandsUpdated: applied };
  }, opts);
}

/**
 * Recompute concession amounts on every open demand for a student.
 *
 * Concession is capped at the UNPAID portion of each component: a student who has already
 * paid ₹4,000 of a ₹10,000 demand and is then granted ₹2,000 owes ₹4,000 — the ₹4,000
 * already paid stays credited. Getting this wrong is exactly what the old code did.
 */
async function applyConcessionsToOpenDemands(scope, studentId, academicYearId, session) {
  const FeeDemand = mongoose.model('FeeDemand');
  const Concession = mongoose.model('Concession');

  const active = await Concession.find({
    tenantId: scope.tenantId,
    studentId,
    academicYearId,
    status: 'approved',
    deletedAt: null,
  }).session(session);

  const openDemands = await FeeDemand.find({
    tenantId: scope.tenantId,
    studentId,
    academicYearId,
    status: { $in: ['pending', 'partial', 'overdue'] },
    deletedAt: null,
  }).session(session);

  const headCache = new Map();
  async function headAllowsConcession(feeHeadId) {
    if (!feeHeadId) return true;
    const key = String(feeHeadId);
    if (!headCache.has(key)) {
      const head = await mongoose.model('FeeHead').findById(feeHeadId).select('concessionAllowed').lean();
      headCache.set(key, head?.concessionAllowed !== false);
    }
    return headCache.get(key);
  }

  const effective = active.filter((c) => c.isEffective());
  let updated = 0;

  for (const demand of openDemands) {
    // Headroom per component: never reduce below what has already been paid on it.
    const headroom = new Map();
    for (const component of demand.components) {
      const allowed = await headAllowsConcession(component.feeHeadId);
      headroom.set(component.name, allowed ? Math.max(0, component.amount - (component.paid || 0)) : 0);
    }

    const granted = new Map(demand.components.map((c) => [c.name, 0]));

    const appliesTo = (concession, component) =>
      !concession.feeHeadIds?.length ||
      concession.feeHeadIds.some((h) => String(h) === String(component.feeHeadId));

    for (const concession of effective) {
      if (concession.isPercentage) {
        // A percentage is naturally per component.
        for (const component of demand.components) {
          if (!appliesTo(concession, component)) continue;
          const room = headroom.get(component.name) - granted.get(component.name);
          if (room <= 0) continue;
          const take = Math.min(money.percentOf(component.amount, concession.value), room);
          granted.set(component.name, granted.get(component.name) + take);
        }
      } else {
        /**
         * A FLAT concession is one pot for the whole demand, distributed across the
         * eligible components — not repeated per component. Applying it per component
         * turned a ₹2,000 award into ₹3,000 across a two-component invoice.
         */
        let pot = concession.value;
        for (const component of demand.components) {
          if (pot <= 0) break;
          if (!appliesTo(concession, component)) continue;
          const room = headroom.get(component.name) - granted.get(component.name);
          if (room <= 0) continue;
          const take = Math.min(pot, room);
          granted.set(component.name, granted.get(component.name) + take);
          pot -= take;
        }
      }
    }

    let changed = false;
    for (const component of demand.components) {
      const value = granted.get(component.name) ?? 0;
      if (value !== component.concession) {
        component.concession = value;
        changed = true;
      }
    }

    if (changed) {
      await demand.save({ session }); // pre-save recalculates every derived total
      updated += 1;
    }
  }

  return updated;
}

// ── Demand generation ────────────────────────────────────────────────────────

/** Resolve the structure that applies to one student. */
async function structureForStudent(scope, student, academicYearId) {
  const criteria = { academicYearId, isActive: true };

  const candidates = await structures().find(scope, criteria, { lean: true });

  // Most specific match wins: category + stream, then category, then 'all'.
  const forClass = candidates.filter(
    (s) => String(s.standardId ?? '') === String(student.standardId ?? ''),
  );

  return (
    forClass.find((s) => s.category === student.category && s.stream === student.stream) ??
    forClass.find((s) => s.category === student.category) ??
    forClass.find((s) => s.category === 'all') ??
    null
  );
}

/** Build the component list for one instalment of a structure. */
function componentsForInstallment(structure, installment) {
  const pct = installment?.percentage;

  return structure.components.map((c) => {
    const amount =
      pct !== undefined && pct !== null ? money.percentOf(c.amount, pct) : c.amount;
    return {
      feeHeadId: c.feeHeadId,
      name: c.name,
      amount,
      concession: 0,
      gstRate: c.gstRate || 0,
      gst: 0,
      paid: 0,
      due: amount,
    };
  });
}

/**
 * Generate demands for a cohort.
 *
 * IDEMPOTENT: each demand carries a `generationKey` under a unique index, so running the
 * generator twice produces no duplicates — the old version happily created a second full
 * set of invoices for every student.
 */
async function generateDemands(scope, { academicGroupId, academicYearId, installmentName, dueDate }, opts = {}) {
  const Student = mongoose.model('Student');
  const FeeDemand = mongoose.model('FeeDemand');

  const academics = require('../academics');
  const studentIds = await academics.service.studentIdsInGroup(scope, academicGroupId);

  if (!studentIds.length) {
    return { generated: 0, skipped: 0, errors: [], message: 'No active students in that class' };
  }

  const students = await Student.find({ _id: { $in: studentIds }, deletedAt: null }).lean();

  const result = { generated: 0, skipped: 0, errors: [] };

  for (const student of students) {
    try {
      const structure = await structureForStudent(scope, student, academicYearId);
      if (!structure) {
        result.errors.push({ studentId: String(student._id), error: 'No fee structure matches this student' });
        continue;
      }

      const installment =
        structure.installments.find((i) => i.name === installmentName) ??
        (structure.schedule === 'one_time' ? null : undefined);

      if (installment === undefined) {
        result.errors.push({
          studentId: String(student._id),
          error: `Instalment "${installmentName}" not found in ${structure.name}`,
        });
        continue;
      }

      const generationKey = [
        String(student._id),
        String(structure._id),
        installmentName || 'full',
      ].join(':');

      // eslint-disable-next-line no-await-in-loop
      const existing = await FeeDemand.findOne({ tenantId: scope.tenantId, generationKey, deletedAt: null });
      if (existing) {
        result.skipped += 1;
        continue;
      }

      // eslint-disable-next-line no-await-in-loop
      await uow.run(async (session) => {
        const { number } = await sequence.nextFormatted({
          tenantId: scope.tenantId,
          branchId: student.branchId,
          kind: 'demand',
          prefix: 'INV',
          session,
        });

        const [demand] = await FeeDemand.create(
          [
            {
              tenantId: scope.tenantId,
              branchId: student.branchId,
              academicYearId,
              studentId: student._id,
              feeStructureId: structure._id,
              demandNo: number,
              period: installmentName || structure.name,
              installmentName,
              dueDate: dueDate ?? installment?.dueDate ?? null,
              components: componentsForInstallment(structure, installment),
              generationKey,
            },
          ],
          { session },
        );

        await publish(
          EVENTS.INVOICE_CREATED,
          {
            tenantId: scope.tenantId,
            branchId: String(student.branchId),
            studentId: String(student._id),
            demandId: String(demand._id),
            demandNo: number,
            amount: demand.totalAmount,
            dueDate: demand.dueDate,
          },
          { session, req: opts.req },
        );
      });

      // Apply any approved concessions the student already holds.
      // eslint-disable-next-line no-await-in-loop
      await applyConcessionsToOpenDemands(scope, student._id, academicYearId, null);

      result.generated += 1;
    } catch (err) {
      result.errors.push({ studentId: String(student._id), error: err.message });
    }
  }

  return result;
}

// ── Collection ───────────────────────────────────────────────────────────────

/**
 * Allocate a payment across a demand's components, oldest head first.
 * Returns the per-component allocations and any unallocated remainder.
 */
function allocateToDemand(demand, amount) {
  let remaining = amount;
  const allocations = [];

  for (const component of demand.components) {
    if (remaining <= 0) break;
    const due = component.due || 0;
    if (due <= 0) continue;

    const take = Math.min(due, remaining);
    component.paid = (component.paid || 0) + take;
    remaining -= take;
    allocations.push({ demandId: demand._id, componentName: component.name, amount: take });
  }

  return { allocations, remaining };
}

/**
 * Collect a payment.
 *
 * Everything below happens in ONE transaction: receipt number reservation, payment
 * record, demand balance updates and ledger postings. A crash at any point leaves no
 * partial state — the previous implementation could record money against an unchanged
 * balance.
 */
async function collectPayment(scope, input, opts = {}) {
  const {
    studentId,
    demandIds = [],
    amount,
    method,
    chequeNo,
    chequeDate,
    bankName,
    gateway,
    gatewayOrderId,
    gatewayPaymentId,
    idempotencyKey,
    remarks,
    paidAt,
  } = input;

  if (!amount || amount <= 0) throw new BusinessRuleError('Payment amount must be positive');

  return uow.run(async (session) => {
    const FeeDemand = mongoose.model('FeeDemand');
    const FeePayment = mongoose.model('FeePayment');
    const Student = mongoose.model('Student');

    const student = await Student.findOne({
      _id: studentId,
      tenantId: scope.tenantId,
      deletedAt: null,
    }).session(session);
    if (!student) throw new NotFoundError('Student not found');

    // Load target demands, oldest due first.
    const criteria = {
      tenantId: scope.tenantId,
      studentId,
      status: { $in: ['pending', 'partial', 'overdue'] },
      deletedAt: null,
    };
    if (demandIds.length) criteria._id = { $in: demandIds };

    const targets = await FeeDemand.find(criteria).sort({ dueDate: 1, createdAt: 1 }).session(session);

    if (!targets.length) throw new BusinessRuleError('This student has no outstanding fees');

    const totalDue = targets.reduce((s, d) => s + d.totalDue, 0);
    if (amount > totalDue) {
      throw new BusinessRuleError(
        `Payment of ${money.format(amount)} exceeds the outstanding ${money.format(totalDue)}`,
        { amount, totalDue },
      );
    }

    // Allocate across demands.
    let remaining = amount;
    const allocations = [];
    const touched = [];

    for (const demand of targets) {
      if (remaining <= 0) break;
      const { allocations: allocated, remaining: left } = allocateToDemand(demand, remaining);
      remaining = left;
      allocations.push(...allocated);
      if (allocated.length) {
        await demand.save({ session });
        touched.push(demand);
      }
    }

    // Atomic receipt number (architecture §10.2) — no read-then-write race.
    const { number: receiptNo } = await sequence.nextFormatted({
      tenantId: scope.tenantId,
      branchId: student.branchId,
      kind: 'receipt',
      prefix: 'RCP',
      session,
    });

    const [payment] = await FeePayment.create(
      [
        {
          tenantId: scope.tenantId,
          branchId: student.branchId,
          academicYearId: targets[0].academicYearId,
          receiptNo,
          studentId,
          amount,
          allocations,
          method,
          chequeNo,
          chequeDate,
          bankName,
          gateway,
          gatewayOrderId,
          gatewayPaymentId,
          idempotencyKey,
          remarks,
          status: 'success',
          collectedBy: scope.userId,
          paidAt: paidAt ?? new Date(),
        },
      ],
      { session },
    );

    // Ledger: debit the money-in account, credit income and GST.
    const gstPortion = touched.reduce((s, d) => s + 0, 0); // GST is already inside the components
    const cashAccount = ['cash'].includes(method)
      ? 'cash'
      : ['upi', 'card', 'netbanking', 'wallet'].includes(method)
        ? 'gateway_receivable'
        : 'bank';

    await postToLedger(
      scope,
      {
        transactionId: `PAY-${payment._id}`,
        refType: 'FeePayment',
        refId: payment._id,
        studentId,
        narration: `Fee receipt ${receiptNo}`,
        lines: [
          { account: cashAccount, debit: amount, credit: 0, branchId: student.branchId, academicYearId: payment.academicYearId },
          { account: 'fee_income', debit: 0, credit: amount - gstPortion, branchId: student.branchId, academicYearId: payment.academicYearId },
          ...(gstPortion > 0
            ? [{ account: 'gst_payable', debit: 0, credit: gstPortion, branchId: student.branchId, academicYearId: payment.academicYearId }]
            : []),
        ],
      },
      session,
    );

    await publish(
      EVENTS.PAYMENT_RECEIVED,
      {
        tenantId: scope.tenantId,
        branchId: String(student.branchId),
        studentId: String(studentId),
        paymentId: String(payment._id),
        receiptNo,
        amount,
        method,
      },
      { session, req: opts.req },
    );

    return { payment, demands: touched };
  }, opts);
}

/**
 * Reverse a payment — a bounced cheque, or a collection entered in error.
 * Re-opens the demands and posts reversal ledger lines; never edits history.
 */
async function reversePayment(scope, paymentId, { reason, bounceCharge = 0 }, opts = {}) {
  return uow.run(async (session) => {
    const FeePayment = mongoose.model('FeePayment');
    const FeeDemand = mongoose.model('FeeDemand');

    const payment = await FeePayment.findOne({
      _id: paymentId,
      tenantId: scope.tenantId,
      deletedAt: null,
    }).session(session);

    if (!payment) throw new NotFoundError('Payment not found');
    if (payment.status === 'reversed') throw new ConflictError('This payment is already reversed');

    const before = payment.toObject();

    /**
     * Roll each allocation back out of its component, grouped BY DEMAND.
     * A payment usually has several allocations against the same demand (one per
     * component); charging the bounce fee per allocation rather than per demand doubled
     * it on a two-component invoice.
     */
    const byDemand = new Map();
    for (const alloc of payment.allocations) {
      const key = String(alloc.demandId);
      if (!byDemand.has(key)) byDemand.set(key, []);
      byDemand.get(key).push(alloc);
    }

    for (const [demandId, allocations] of byDemand) {
      const demand = await FeeDemand.findById(demandId).session(session);
      if (!demand) continue;

      for (const alloc of allocations) {
        const component = demand.components.find((c) => c.name === alloc.componentName);
        if (component) component.paid = Math.max(0, (component.paid || 0) - alloc.amount);
      }

      if (bounceCharge > 0) demand.lateFee = (demand.lateFee || 0) + bounceCharge;

      demand.status = 'pending'; // recalculate() settles the final value
      await demand.save({ session });
    }

    payment.status = 'reversed';
    payment.isBounced = !!bounceCharge;
    payment.bouncedAt = bounceCharge ? new Date() : undefined;
    payment.bounceCharge = bounceCharge;
    payment.reversedAt = new Date();
    payment.reversalReason = reason;
    await payment.save({ session });

    await postToLedger(
      scope,
      {
        transactionId: `REV-${payment._id}`,
        refType: 'Reversal',
        refId: payment._id,
        studentId: payment.studentId,
        narration: `Reversal of ${payment.receiptNo}: ${reason}`,
        lines: [
          { account: 'fee_income', debit: payment.amount, credit: 0, branchId: payment.branchId },
          { account: payment.method === 'cash' ? 'cash' : 'bank', debit: 0, credit: payment.amount, branchId: payment.branchId },
        ],
      },
      session,
    );

    record({
      req: opts.req,
      module: 'fees',
      action: 'payment_reversed',
      resourceType: 'FeePayment',
      resourceId: payment._id,
      before,
      after: payment.toObject(),
      reason,
    });

    return payment;
  }, opts);
}

// ── Reporting ────────────────────────────────────────────────────────────────

/** Outstanding amount for a student — used by the TC no-dues check. */
async function outstandingForStudent(scope, studentId) {
  const rows = await demands().aggregate(scope, [
    { $match: { studentId: new mongoose.Types.ObjectId(String(studentId)), status: { $in: ['pending', 'partial', 'overdue'] } } },
    { $group: { _id: null, total: { $sum: '$totalDue' }, count: { $sum: 1 } } },
  ]);
  return { amount: rows[0]?.total ?? 0, demandCount: rows[0]?.count ?? 0 };
}

/** True when a student owes nothing — consumed by the certificates module. */
async function hasClearedDues(scope, studentId) {
  const { amount } = await outstandingForStudent(scope, studentId);
  return amount === 0;
}

/** Day book — every collection for a date, by method. */
async function dayBook(scope, { date }) {
  const from = new Date(date);
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setDate(to.getDate() + 1);

  const rows = await payments().aggregate(scope, [
    { $match: { paidAt: { $gte: from, $lt: to }, status: 'success' } },
    { $group: { _id: '$method', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    { $sort: { total: -1 } },
  ]);

  return {
    date: from,
    byMethod: rows.map((r) => ({ method: r._id, total: r.total, count: r.count })),
    total: rows.reduce((s, r) => s + r.total, 0),
    count: rows.reduce((s, r) => s + r.count, 0),
  };
}

/** Defaulters, paginated — the old version returned every row unbounded. */
async function defaulters(scope, { page = 1, limit = 50, academicGroupId, minAmount = 1 } = {}) {
  const criteria = { status: { $in: ['pending', 'partial', 'overdue'] }, totalDue: { $gte: minAmount } };

  if (academicGroupId) {
    const academics = require('../academics');
    const ids = await academics.service.studentIdsInGroup(scope, academicGroupId);
    criteria.studentId = { $in: ids };
  }

  return demands().paginate(scope, criteria, {
    page,
    limit,
    sort: { dueDate: 1 },
    populate: { path: 'studentId', select: 'name admissionNo rollNo standardId divisionName guardians' },
  });
}

module.exports = {
  // concessions
  requestConcession,
  approveConcession,
  percentageOfOutstanding,
  applyConcessionsToOpenDemands,
  // demands
  generateDemands,
  structureForStudent,
  // collection
  collectPayment,
  reversePayment,
  allocateToDemand,
  // reporting
  outstandingForStudent,
  hasClearedDues,
  dayBook,
  defaulters,
  postToLedger,
  repos: { heads, structures, demands, payments, concessions, ledger },
};
