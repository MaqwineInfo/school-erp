/**
 * Approval engine.
 *
 * Architecture §11. Replaces a stub that supported one step, hard-coded its approver set
 * as a JavaScript array, and knew about exactly two resource types.
 *
 * Three properties matter here:
 *   1. Approvers are resolved from RBAC, never from a literal role list.
 *   2. Maker ≠ checker is enforced by the ENGINE, so a module cannot forget it.
 *   3. On approval the engine publishes an event; the owning module applies the change.
 *      The approvals module never writes another module's data.
 */
const mongoose = require('mongoose');

const uow = require('../../platform/uow/unitOfWork');
const { repo } = require('../../infra/repository/BaseRepository');
const { publish } = require('../../infra/events/bus');
const { EVENTS } = require('../../infra/events/events');
const { record } = require('../../platform/audit/auditLogger');
const { WORKFLOWS } = require('./workflowDefinitions');
const {
  BusinessRuleError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
} = require('../../shared/errors');

const requests = () => repo(mongoose.model('ApprovalRequest'));
const workflows = () => repo(mongoose.model('ApprovalWorkflow'));

// ── Seeding ──────────────────────────────────────────────────────────────────

/** Install the nine default workflows for a tenant. Idempotent. */
async function seedWorkflows(tenantId, { force = false } = {}) {
  const ApprovalWorkflow = mongoose.model('ApprovalWorkflow');
  const results = [];

  for (const def of WORKFLOWS) {
    const existing = await ApprovalWorkflow.findOne({ tenantId, key: def.key, deletedAt: null });
    if (existing && !force) {
      results.push({ key: def.key, action: 'skipped' });
      continue;
    }
    if (existing) {
      Object.assign(existing, def, { tenantId });
      await existing.save();
      results.push({ key: def.key, action: 'updated' });
    } else {
      await ApprovalWorkflow.create({ ...def, tenantId });
      results.push({ key: def.key, action: 'created' });
    }
  }
  return results;
}

// ── Step evaluation ──────────────────────────────────────────────────────────

/** Resolve a step's threshold, from the tenant's configuration or a literal. */
function thresholdFor(step, tenant) {
  if (step.condition?.thresholdKey) {
    return tenant?.approvalThresholds?.[step.condition.thresholdKey] ?? Infinity;
  }
  return step.condition?.value;
}

/** Does this step apply to this request? */
function stepApplies(step, payload, tenant) {
  const cond = step.condition;
  if (!cond || cond.op === 'always' || !cond.field) return true;

  const actual = Number(payload?.[cond.field] ?? 0);
  const expected = Number(thresholdFor(step, tenant));
  if (Number.isNaN(expected)) return true;

  switch (cond.op) {
    case 'gt': return actual > expected;
    case 'gte': return actual >= expected;
    case 'lt': return actual < expected;
    case 'lte': return actual <= expected;
    case 'eq': return actual === expected;
    default: return true;
  }
}

/** The steps that actually apply, renumbered 1..n. */
function applicableSteps(workflow, payload, tenant) {
  return workflow.steps
    .filter((s) => stepApplies(s, payload, tenant))
    .sort((a, b) => a.order - b.order)
    .map((s, i) => ({ ...(s.toObject ? s.toObject() : s), effectiveOrder: i + 1 }));
}

/** Who may action this step? Resolved from RBAC, not from a hard-coded list. */
async function resolveApprovers(scope, step, request) {
  const User = mongoose.model('User');
  const UserRole = mongoose.model('UserRole');

  if (step.approverRule.type === 'named_users') {
    return step.approverRule.userIds ?? [];
  }

  if (step.approverRule.type === 'reporting_officer') {
    const requester = await User.findById(request.requestedBy).select('reportsTo').lean();
    return requester?.reportsTo ? [requester.reportsTo] : [];
  }

  if (step.approverRule.type === 'role') {
    const bindings = await UserRole.find({
      tenantId: scope.tenantId,
      roleSlug: step.approverRule.value,
      isActive: true,
    })
      .select('userId')
      .lean();
    return bindings.map((b) => b.userId);
  }

  // module_permission — every user whose roles grant `approve` on the module.
  const Role = mongoose.model('Role');
  const roles = await Role.find({
    $or: [{ tenantId: scope.tenantId }, { tenantId: null }],
    deletedAt: null,
    isActive: true,
  }).lean();

  const allowed = roles
    .filter((r) => {
      const m = r.matrix instanceof Map ? Object.fromEntries(r.matrix) : r.matrix;
      return m?.[step.approverRule.value]?.canApprove;
    })
    .map((r) => r.slug);

  const bindings = await UserRole.find({
    tenantId: scope.tenantId,
    roleSlug: { $in: allowed },
    isActive: true,
  })
    .select('userId')
    .lean();

  return bindings.map((b) => b.userId);
}

// ── Lifecycle ────────────────────────────────────────────────────────────────

/**
 * Raise an approval request.
 *
 * @param {object} args
 * @param {string} args.workflowKey
 * @param {string} args.resourceType
 * @param {*}      args.resourceId
 * @param {string} args.title
 * @param {object} args.payload    values the step conditions test (amount in paise…)
 */
async function submit(scope, args, opts = {}) {
  return uow.run(async (session) => {
    const ApprovalRequest = mongoose.model('ApprovalRequest');
    const Tenant = mongoose.model('Tenant');

    const workflow = await workflows().findOne(scope, { key: args.workflowKey, isActive: true });
    if (!workflow) {
      throw new BusinessRuleError(
        `No approval workflow is configured for "${args.workflowKey}"`,
      );
    }

    const tenant = await Tenant.findById(scope.tenantId).select('approvalThresholds').lean();
    const steps = applicableSteps(workflow, args.payload, tenant);

    if (!steps.length) {
      // Nothing to approve — auto-approve and tell the caller so it can apply the change.
      return { autoApproved: true, request: null };
    }

    const [request] = await ApprovalRequest.create(
      [
        {
          tenantId: scope.tenantId,
          // Stamp the branch from scope when the caller does not supply one, so the
          // request appears in the right approvers' inboxes. A null branch would be
          // filtered out by every own_branch approver.
          branchId: args.branchId ?? (Array.isArray(scope.branchIds) ? scope.branchIds[0] : null) ?? null,
          workflowKey: args.workflowKey,
          module: workflow.module,
          resourceType: args.resourceType,
          resourceId: args.resourceId,
          title: args.title,
          payload: args.payload ?? {},
          currentStep: 1,
          totalSteps: steps.length,
          status: 'pending',
          pendingApproverRole: steps[0].approverRule.value ?? null,
          pendingApproverIds: await resolveApprovers(scope, steps[0], { requestedBy: scope.userId }),
          dueAt: new Date(Date.now() + (steps[0].slaHours ?? 48) * 3600 * 1000),
          requestedBy: scope.userId,
          history: [
            {
              step: 0,
              stepName: 'Submitted',
              actorId: scope.userId,
              action: 'submitted',
              at: new Date(),
            },
          ],
        },
      ],
      { session },
    );

    await publish(
      EVENTS.APPROVAL_REQUESTED,
      {
        tenantId: scope.tenantId,
        requestId: String(request._id),
        workflowKey: args.workflowKey,
        title: args.title,
        approverIds: request.pendingApproverIds.map(String),
      },
      { session, req: opts.req },
    );

    return { autoApproved: false, request };
  }, opts);
}

/** Approve the current step, advancing or completing the request. */
async function approve(scope, requestId, { remarks } = {}, opts = {}) {
  return uow.run(async (session) => {
    const ApprovalRequest = mongoose.model('ApprovalRequest');
    const Tenant = mongoose.model('Tenant');

    const request = await ApprovalRequest.findOne({
      _id: requestId,
      tenantId: scope.tenantId,
    }).session(session);

    if (!request) throw new NotFoundError('Approval request not found');
    if (request.status !== 'pending') {
      throw new ConflictError(`This request is already ${request.status}`);
    }

    const workflow = await workflows().findOne(scope, { key: request.workflowKey });
    if (!workflow) throw new NotFoundError('Workflow definition not found');

    const tenant = await Tenant.findById(scope.tenantId).select('approvalThresholds').lean();
    const steps = applicableSteps(workflow, request.payload, tenant);
    const step = steps[request.currentStep - 1];
    if (!step) throw new BusinessRuleError('Workflow step not found');

    // Maker ≠ checker — enforced here so no module can skip it.
    if (step.makerCheckerSeparation && String(request.requestedBy) === String(scope.userId)) {
      throw new ForbiddenError(
        'You prepared this request and cannot also approve it (separation of duties)',
      );
    }

    // The actor must be an eligible approver for this step.
    const approvers = await resolveApprovers(scope, step, request);
    const eligible = approvers.map(String).includes(String(scope.userId));
    if (!eligible) {
      throw new ForbiddenError(`This step requires approval by: ${step.name}`);
    }

    request.history.push({
      step: request.currentStep,
      stepName: step.name,
      actorId: scope.userId,
      action: 'approved',
      remarks,
      at: new Date(),
    });

    const isLastStep = request.currentStep >= steps.length;

    if (isLastStep) {
      request.status = 'approved';
      request.reviewedBy = scope.userId;
      request.reviewedAt = new Date();
      request.pendingApproverIds = [];
      request.pendingApproverRole = null;
    } else {
      request.currentStep += 1;
      const next = steps[request.currentStep - 1];
      request.pendingApproverRole = next.approverRule.value ?? null;
      request.pendingApproverIds = await resolveApprovers(scope, next, request);
      request.dueAt = new Date(Date.now() + (next.slaHours ?? 48) * 3600 * 1000);
    }

    await request.save({ session });

    if (request.status === 'approved') {
      // The owning module subscribes and applies the change — the engine never writes
      // another module's data (ADR-14).
      await publish(
        EVENTS.APPROVAL_GRANTED,
        {
          tenantId: scope.tenantId,
          requestId: String(request._id),
          workflowKey: request.workflowKey,
          resourceType: request.resourceType,
          resourceId: String(request.resourceId),
          payload: request.payload,
          approvedBy: String(scope.userId),
        },
        { session, req: opts.req },
      );
    }

    record({
      req: opts.req,
      module: request.module,
      action: 'approve',
      resourceType: 'ApprovalRequest',
      resourceId: request._id,
      after: { status: request.status, step: request.currentStep },
      reason: remarks,
    });

    return request;
  }, opts);
}

/** Reject the request. Terminal by default. */
async function reject(scope, requestId, { reason }, opts = {}) {
  return uow.run(async (session) => {
    const ApprovalRequest = mongoose.model('ApprovalRequest');

    const request = await ApprovalRequest.findOne({
      _id: requestId,
      tenantId: scope.tenantId,
    }).session(session);

    if (!request) throw new NotFoundError('Approval request not found');
    if (request.status !== 'pending') {
      throw new ConflictError(`This request is already ${request.status}`);
    }

    request.status = 'rejected';
    request.rejectionReason = reason;
    request.reviewedBy = scope.userId;
    request.reviewedAt = new Date();
    request.pendingApproverIds = [];
    request.history.push({
      step: request.currentStep,
      actorId: scope.userId,
      action: 'rejected',
      remarks: reason,
      at: new Date(),
    });

    await request.save({ session });

    await publish(
      EVENTS.APPROVAL_REJECTED,
      {
        tenantId: scope.tenantId,
        requestId: String(request._id),
        workflowKey: request.workflowKey,
        resourceType: request.resourceType,
        resourceId: String(request.resourceId),
        reason,
      },
      { session, req: opts.req },
    );

    return request;
  }, opts);
}

/** The approver inbox — what THIS user can currently action. */
async function inbox(scope, { page = 1, limit = 20 } = {}) {
  return requests().paginate(
    scope,
    { status: 'pending', pendingApproverIds: scope.userId },
    { page, limit, sort: { dueAt: 1 }, populate: { path: 'requestedBy', select: 'name email role' } },
  );
}

/** What this user has raised. */
async function myRequests(scope, { page = 1, limit = 20, status } = {}) {
  const criteria = { requestedBy: scope.userId };
  if (status) criteria.status = status;
  return requests().paginate(scope, criteria, { page, limit, sort: { createdAt: -1 } });
}

/** Escalate anything past its SLA. Called by the scheduled job. */
async function escalateOverdue() {
  const ApprovalRequest = mongoose.model('ApprovalRequest');
  const overdue = await ApprovalRequest.find({
    status: 'pending',
    dueAt: { $lt: new Date() },
  }).limit(500);

  for (const request of overdue) {
    request.history.push({
      step: request.currentStep,
      action: 'escalated',
      remarks: 'SLA breached',
      at: new Date(),
    });
    await request.save();

    await publish(EVENTS.APPROVAL_ESCALATED, {
      tenantId: request.tenantId,
      requestId: String(request._id),
      workflowKey: request.workflowKey,
      title: request.title,
    });
  }

  return overdue.length;
}

module.exports = {
  seedWorkflows,
  submit,
  approve,
  reject,
  inbox,
  myRequests,
  escalateOverdue,
  applicableSteps,
  stepApplies,
  resolveApprovers,
  repos: { requests, workflows },
};
