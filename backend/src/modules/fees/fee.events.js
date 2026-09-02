/**
 * Fee event subscribers.
 *
 * ADR-14: the approvals engine publishes, the owning module applies. A granted
 * fee-concession workflow lands here and is applied to the student's open demands — the
 * engine never writes a fee document itself.
 */
const { Scope } = require('../../platform/scope/scope');
const { subscribe } = require('../../infra/events/bus');
const { EVENTS } = require('../../infra/events/events');
const logger = require('../../config/logger');
const service = require('./fee.service');

function wire() {
  subscribe(
    EVENTS.APPROVAL_GRANTED,
    async (payload) => {
      if (payload.workflowKey !== 'fee_concession') return;

      const scope = Scope.system('event:fee_concession_approved', { tenantId: payload.tenantId });
      await service.approveConcession(scope, payload.resourceId, {
        reason: 'Approved via workflow',
      });
    },
    { label: 'fees:applyApprovedConcession' },
  );

  subscribe(
    EVENTS.APPROVAL_REJECTED,
    async (payload) => {
      if (payload.workflowKey !== 'fee_concession') return;

      const mongoose = require('mongoose');
      await mongoose.model('Concession').updateOne(
        { _id: payload.resourceId },
        { $set: { status: 'rejected', rejectionReason: payload.reason } },
      );
      logger.info('Fee concession rejected', { concessionId: String(payload.resourceId) });
    },
    { label: 'fees:rejectConcession' },
  );
}

module.exports = { wire };
