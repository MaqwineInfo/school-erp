/**
 * Exam event subscribers.
 *
 * Event handlers run outside any request, so they legitimately construct a system scope —
 * which is why the lint guard permits `Scope.system()` in `*.events.js` and `*.jobs.js`
 * but nowhere else in a module (architecture §6.4).
 */
const { Scope } = require('../../platform/scope/scope');
const { subscribe } = require('../../infra/events/bus');
const { EVENTS } = require('../../infra/events/events');
const service = require('./marks.service');

/**
 * Apply an approved mark correction.
 * The approvals engine publishes; this module applies (ADR-14) — the engine never writes
 * another module's data.
 */
function wire() {
  subscribe(
    EVENTS.APPROVAL_GRANTED,
    async (payload) => {
      if (payload.workflowKey !== 'mark_correction') return;

      const scope = Scope.system('event:mark_correction_approved', { tenantId: payload.tenantId });
      await service.applyApprovedCorrection(scope, {
        marksEntryId: payload.resourceId,
        newMarks: payload.payload.newMarks,
        reason: payload.payload.reason,
        approvalRequestId: payload.requestId,
      });
    },
    { label: 'exams:applyMarkCorrection' },
  );
}

module.exports = { wire };
