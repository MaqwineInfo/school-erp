const ApprovalRequest = require('../models/ApprovalRequest');

const TYPE_MODULE_MAP = {
  leave: 'hr',
  fee_concession: 'fees',
  expense: 'expenses',
  mark_correction: 'examinations',
  certificate: 'certificates',
  admission: 'admissions',
  payroll: 'payroll',
  inventory: 'inventory',
  student_transfer: 'students',
};

async function createApprovalRequest({
  tenantId, branchId, type, title, description,
  resourceType, resourceId, requestedBy, metadata,
}) {
  const module = TYPE_MODULE_MAP[type] || 'tasks';
  return ApprovalRequest.create({
    tenantId, branchId, module, type, title, description,
    resourceType, resourceId, requestedBy, metadata,
    status: 'pending',
  });
}

async function resolveApproval({ resourceType, resourceId, status, reviewedBy, rejectionReason }) {
  return ApprovalRequest.findOneAndUpdate(
    { resourceType, resourceId, status: 'pending' },
    { $set: { status, reviewedBy, reviewedAt: new Date(), rejectionReason: rejectionReason || null } },
    { new: true }
  );
}

async function cancelApproval({ resourceType, resourceId }) {
  return ApprovalRequest.findOneAndUpdate(
    { resourceType, resourceId, status: 'pending' },
    { $set: { status: 'cancelled' } },
    { new: true }
  );
}

module.exports = { createApprovalRequest, resolveApproval, cancelApproval, TYPE_MODULE_MAP };
