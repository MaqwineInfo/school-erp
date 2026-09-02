/**
 * Audit writing.
 *
 * Architecture §15. Two entry points:
 *   - `audit(module, action, opts)` — route middleware, captures the response
 *   - `record(...)`                 — called directly by a service that already holds
 *                                     before/after snapshots (the accurate path)
 *
 * Services that mutate should prefer `record`: middleware can only see the response body,
 * so it cannot know the previous values. The RBAC document requires old AND new values for
 * financial and academic changes, which the previous middleware-only approach could not
 * provide.
 */
const mongoose = require('mongoose');
const { computeDiff, redactSnapshot } = require('./diff');
const logger = require('../../config/logger');

/** RBAC §6.1 — actions requiring step-up MFA and a mandatory reason. */
const CRITICAL_ACTIONS = new Set([
  'role_management:assign',
  'role_management:add',
  'role_management:edit',
  'role_management:delete',
  'payroll:release',
  'payroll:export',
  'payroll:approve',
  'fees:structure_edit',
  'fees:waiver_approve',
  'fees:delete',
  'students:export_pii',
  'students:delete',
  'students:aadhaar_unmask',
  'examinations:mark_unlock',
  'certificates:issue_tc',
  'certificates:add',
  'audit_logs:export',
  'settings:tenant_provision',
  'settings:tenant_suspend',
  'discipline:posh_access',
]);

/**
 * RBAC §6.3 retention, in CALENDAR YEARS. `null` = permanent.
 * Years rather than days×365: a statutory "7 years" means seven calendar years, and
 * day arithmetic drifts by a day per leap year.
 */
const RETENTION_YEARS = {
  fees: 7, // GST / Income Tax
  payroll: 7,
  expenses: 7,
  role_management: 7,
  examinations: 3, // board compliance
  students: 3, // DPDP — PII access
  auth: 1,
  communication: 1, // TRAI / DLT
  certificates: null, // permanent
  discipline: null, // POSH — permanent
};

const DEFAULT_RETENTION_YEARS = 3;

function retainUntilFor(module, at = new Date()) {
  const years = Object.prototype.hasOwnProperty.call(RETENTION_YEARS, module)
    ? RETENTION_YEARS[module]
    : DEFAULT_RETENTION_YEARS;
  if (years === null) return null; // permanent
  const d = new Date(at);
  d.setFullYear(d.getFullYear() + years);
  return d;
}

function severityFor(module, action) {
  if (CRITICAL_ACTIONS.has(`${module}:${action}`)) return 'critical';
  if (['delete', 'approve', 'export', 'release', 'unlock'].includes(action)) return 'warning';
  return 'info';
}

function isCritical(module, action) {
  return CRITICAL_ACTIONS.has(`${module}:${action}`);
}

function actorFrom(req) {
  const p = req?.principal || {};
  return {
    tenantId: p.tenantId ?? null,
    branchId: p.branchId ?? null,
    userId: p.userId ?? null,
    userEmail: p.email ?? null,
    userRole: p.role ?? null,
    userName: p.name ?? null,
    impersonatedBy: p.impersonatedBy ?? null,
    requestId: req?.requestId ?? null,
    ip: req?.ip ?? req?.connection?.remoteAddress ?? null,
    userAgent: req?.get?.('User-Agent') ?? null,
  };
}

/**
 * Write an audit row directly. Fire-and-forget: an audit failure must never fail the
 * business operation, but it IS logged loudly so the gap is visible.
 *
 * @param {object} args
 * @param {object} args.req
 * @param {string} args.module
 * @param {string} args.action
 * @param {string} [args.resourceType]
 * @param {*}      [args.resourceId]
 * @param {object} [args.before]  snapshot before the change
 * @param {object} [args.after]   snapshot after the change
 * @param {string} [args.reason]
 * @param {string[]} [args.tags]
 */
function record({
  req,
  module,
  action,
  resourceType,
  resourceId,
  before = null,
  after = null,
  reason = null,
  tags = [],
}) {
  try {
    const AuditLog = mongoose.model('AuditLog');
    const actor = actorFrom(req);

    const beforeSnap = before ? redactSnapshot(before) : null;
    const afterSnap = after ? redactSnapshot(after) : null;
    const diff = before || after ? computeDiff(beforeSnap, afterSnap) : [];

    return AuditLog.create({
      ...actor,
      module,
      action,
      resourceType: resourceType ?? module,
      resourceId: resourceId ?? null,
      before: beforeSnap,
      after: afterSnap,
      diff,
      reason,
      severity: severityFor(module, action),
      tags,
      retainUntil: retainUntilFor(module),
    }).catch((err) => {
      logger.error('Audit write failed', { module, action, error: err.message });
    });
  } catch (err) {
    logger.error('Audit write threw', { module, action, error: err.message });
    return Promise.resolve();
  }
}

/**
 * Route middleware. Records the action once the response succeeds.
 *
 * Use this for creates and deletes, where "after" (or "before") is enough. For updates,
 * call `record()` from the service with both snapshots — middleware cannot see the old
 * values.
 */
function audit(module, action, { resourceType, requireReason } = {}) {
  return (req, res, next) => {
    const originalJson = res.json.bind(res);

    res.json = (body) => {
      // Only audit successful operations; a 4xx is not a state change.
      if (res.statusCode >= 200 && res.statusCode < 300) {
        record({
          req,
          module,
          action,
          resourceType,
          resourceId: req.params?.id ?? body?.data?._id ?? null,
          after: body?.data ?? null,
          before: req.auditBefore ?? null, // a service may stash the prior state here
          reason: req.body?.reason ?? null,
        });
      }
      return originalJson(body);
    };

    if (requireReason && !req.body?.reason) {
      const { BadRequestError } = require('../../shared/errors');
      return next(new BadRequestError('A reason is required for this action'));
    }

    return next();
  };
}

/** Delete audit rows past their retention date. Called by the nightly sweep job only. */
async function purgeExpired() {
  const AuditLog = mongoose.model('AuditLog');
  const res = await AuditLog.purgeExpired();
  logger.info('Audit retention sweep', { deleted: res.deletedCount });
  return res.deletedCount;
}

module.exports = {
  audit,
  record,
  purgeExpired,
  isCritical,
  severityFor,
  retainUntilFor,
  CRITICAL_ACTIONS,
  RETENTION_YEARS,
};
