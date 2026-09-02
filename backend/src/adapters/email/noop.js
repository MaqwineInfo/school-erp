const crypto = require('crypto');
const logger = require('../../config/logger');

function create(settings, ctx = {}) {
  return {
    provider: 'noop',
    capability: 'email',

    async send({ to, subject, html, text, attachments = [] }) {
      const id = `noop_${crypto.randomBytes(8).toString('hex')}`;
      logger.info('[noop:email] would send', {
        to,
        subject,
        attachments: attachments.map((a) => a.filename),
        preview: (text || html || '').slice(0, 120),
        tenantId: ctx.tenantId,
      });
      return { id, status: 'sent', provider: 'noop', simulated: true };
    },
  };
}

module.exports = { create };
