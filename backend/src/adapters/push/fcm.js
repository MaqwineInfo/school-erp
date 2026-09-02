/**
 * Firebase Cloud Messaging driver (HTTP v1 via the legacy send endpoint).
 * Used by the Flutter apps for parent/student/teacher/driver notifications.
 */
const logger = require('../../config/logger');

const FCM_URL = 'https://fcm.googleapis.com/fcm/send';
const BATCH_SIZE = 500; // FCM's multicast limit

function create(settings, ctx = {}) {
  const { serverKey } = settings;
  if (!serverKey) throw new Error('fcm driver requires a serverKey');

  return {
    provider: 'fcm',
    capability: 'push',

    async send({ tokens = [], title, body, data = {}, priority = 'high' }) {
      if (!tokens.length) return { id: null, status: 'skipped', successCount: 0 };

      let successCount = 0;
      let failureCount = 0;
      const invalidTokens = [];

      for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
        const batch = tokens.slice(i, i + BATCH_SIZE);
        const res = await fetch(FCM_URL, {
          method: 'POST',
          headers: {
            Authorization: `key=${serverKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            registration_ids: batch,
            priority,
            notification: { title, body },
            data,
          }),
        });

        const json = await res.json().catch(() => ({}));

        if (!res.ok) {
          logger.error('FCM send failed', { status: res.status, tenantId: ctx.tenantId });
          failureCount += batch.length;
          continue;
        }

        successCount += json.success ?? 0;
        failureCount += json.failure ?? 0;

        // Collect tokens FCM says are dead so the caller can prune its registry.
        (json.results || []).forEach((r, idx) => {
          if (r.error === 'NotRegistered' || r.error === 'InvalidRegistration') {
            invalidTokens.push(batch[idx]);
          }
        });
      }

      return {
        status: failureCount === 0 ? 'sent' : 'partial',
        provider: 'fcm',
        successCount,
        failureCount,
        invalidTokens,
      };
    },
  };
}

module.exports = { create };
