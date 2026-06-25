/**
 * RBAC Middleware — Full backend permission enforcement
 * Source: RBAC_Permission_Architecture_Plan.md — Section 3
 *
 * Usage on routes:
 *   router.get('/', authenticate, checkPermission('fees', 'view'), ctrl.list);
 *   router.post('/', authenticate, checkPermission('fees', 'add'), ctrl.create);
 *   router.put('/:id', authenticate, checkPermission('fees', 'edit'), ctrl.update);
 *   router.delete('/:id', authenticate, checkPermission('fees', 'delete'), ctrl.remove);
 *   router.patch('/:id/approve', authenticate, checkPermission('fees', 'approve'), ctrl.approve);
 *   router.get('/export', authenticate, checkPermission('fees', 'export'), ctrl.export);
 */
const Permission = require('../models/Permission');
const AuditLog = require('../models/AuditLog');
const { AppError } = require('../shared/errors');

// Simple in-memory cache: key = `${role}:${module}`, ttl = 5 minutes
const permCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

async function getPermission(role, module) {
  const key = `${role}:${module}`;
  const cached = permCache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

  const perm = await Permission.findOne({ role, module }).lean();
  permCache.set(key, { data: perm, ts: Date.now() });
  return perm;
}

// Clear cache when permissions are updated (call this after seeding or editing)
function clearPermissionCache() { permCache.clear(); }

/**
 * checkPermission(module, action)
 * Middleware factory — checks if user's role has the requested action on the module.
 * Also attaches req.rbacScope with branchScope, dataScope, studentScope for controllers to use.
 */
function checkPermission(module, action) {
  return async (req, res, next) => {
    try {
      const user = req.user;
      if (!user) return next(new AppError('Not authenticated', 401));

      // super_admin bypasses all module-level checks
      if (user.role === 'super_admin') {
        req.rbacScope = { branchScope: 'all_branches', dataScope: 'group', studentScope: 'all' };
        return next();
      }

      const perm = await getPermission(user.role, module);

      if (!perm) {
        return next(new AppError(`Access denied: no permissions found for role "${user.role}" on module "${module}"`, 403));
      }

      // Map action string to Permission field
      const actionMap = {
        view: 'canView', add: 'canAdd', edit: 'canEdit', delete: 'canDelete',
        approve: 'canApprove', export: 'canExport',
      };
      const field = actionMap[action];
      if (!field) return next(new AppError(`Unknown action: ${action}`, 400));

      if (!perm[field]) {
        return next(new AppError(
          `Access denied: role "${user.role}" cannot perform "${action}" on module "${module}"`,
          403
        ));
      }

      // Attach scope to req for controllers to apply data filtering
      req.rbacScope = {
        branchScope: perm.branchScope,
        dataScope: perm.dataScope,
        studentScope: perm.studentScope,
      };

      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * applyBranchScope — Middleware that attaches branchFilter to req
 * Controllers should use req.branchFilter when querying MongoDB.
 *
 * For own_branch roles: { tenantId, branchId }
 * For all_branches roles (super_admin, trustee): { tenantId } only
 */
function applyBranchScope(req, res, next) {
  const user = req.user;
  if (!user) return next();

  const isAllBranches = ['super_admin'].includes(user.role);

  if (isAllBranches) {
    req.branchFilter = { tenantId: user.tenantId };
  } else {
    req.branchFilter = {
      tenantId: user.tenantId,
      ...(user.branchId ? { branchId: user.branchId } : {}),
    };
  }

  next();
}

/**
 * audit(module, action) — Middleware to log sensitive actions to AuditLog.
 * Attach AFTER the actual controller logic using res.on('finish').
 *
 * Usage: router.post('/', authenticate, checkPermission('fees','add'), audit('fees','create'), ctrl.create)
 */
function audit(module, action, getSeverity = () => 'info') {
  return async (req, res, next) => {
    // Intercept response to know the resourceId after creation
    const originalJson = res.json.bind(res);
    res.json = function (body) {
      // Fire-and-forget audit log write
      const user = req.user || {};
      const severity = getSeverity(action, module);
      AuditLog.create({
        tenantId: user.tenantId,
        branchId: user.branchId,
        userId: user.userId,
        userEmail: user.email,
        userRole: user.role,
        userName: user.name,
        module,
        action,
        resourceId: req.params?.id || body?.data?._id,
        resourceType: module,
        ip: req.ip || req.connection?.remoteAddress,
        userAgent: req.get('User-Agent'),
        severity,
      }).catch(() => {}); // non-blocking; never fail requests due to audit log errors
      return originalJson(body);
    };
    next();
  };
}

/**
 * Critical action severity helper
 * Used to tag high-risk audit events
 */
const CRITICAL_ACTIONS = new Set([
  'fees:approve', 'fees:delete', 'payroll:approve', 'payroll:export',
  'certificates:add', 'students:delete', 'role_management:add', 'role_management:edit',
  'audit_logs:export', 'settings:edit',
]);

function getSeverity(action, module) {
  if (CRITICAL_ACTIONS.has(`${module}:${action}`)) return 'critical';
  if (['delete', 'approve', 'export'].includes(action)) return 'warning';
  return 'info';
}

module.exports = { checkPermission, applyBranchScope, audit, clearPermissionCache, getPermission };
