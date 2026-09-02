/**
 * SMTP driver.
 *
 * `nodemailer` is loaded lazily so the package is only required when a tenant actually
 * configures SMTP — a fresh install with no credentials never touches it and never fails
 * to boot because of a missing optional dependency.
 */
const logger = require('../../config/logger');

function create(settings, ctx = {}) {
  const { host, port, user, pass, from, secure } = settings;
  if (!host || !user) throw new Error('smtp driver requires host and user');

  let transport = null;

  function getTransport() {
    if (transport) return transport;
    let nodemailer;
    try {
      nodemailer = require('nodemailer');
    } catch {
      throw new Error(
        'SMTP is configured for this school but the "nodemailer" package is not installed. ' +
          'Run `npm install nodemailer` in backend/, or switch the email driver to noop.',
      );
    }
    transport = nodemailer.createTransport({
      host,
      port: port || 587,
      secure: secure ?? Number(port) === 465,
      auth: { user, pass },
    });
    return transport;
  }

  return {
    provider: 'smtp',
    capability: 'email',

    async send({ to, subject, html, text, attachments = [], replyTo }) {
      try {
        const info = await getTransport().sendMail({
          from: from || user,
          to: Array.isArray(to) ? to.join(',') : to,
          subject,
          text,
          html,
          attachments,
          replyTo,
        });
        return { id: info.messageId, status: 'sent', provider: 'smtp', accepted: info.accepted };
      } catch (err) {
        logger.error('SMTP send failed', { error: err.message, tenantId: ctx.tenantId });
        return { id: null, status: 'failed', provider: 'smtp', error: err.message };
      }
    },

    async verify() {
      await getTransport().verify();
      return { ok: true };
    },
  };
}

module.exports = { create };
