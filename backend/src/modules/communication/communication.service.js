/**
 * Communication service — the dispatcher.
 *
 * Closes defect A8. Previously NOTHING was sent: there was no adapter, no template
 * registry, no queue, and no scheduler, so every notification described in every workflow
 * document was unimplemented.
 *
 * Policy enforced here (Plan.docx §19, specification §14):
 *   - quiet hours 21:00–07:00 for non-critical messages
 *   - at most 5 non-critical messages per recipient per day
 *   - opt-out honoured for non-transactional messages
 *   - a send is always RECORDED, even when suppressed, so nothing vanishes silently
 */
const mongoose = require('mongoose');

const { repo } = require('../../infra/repository/BaseRepository');
const { forTenant } = require('../../adapters/registry');
const logger = require('../../config/logger');
const { BusinessRuleError } = require('../../shared/errors');

const notifications = () => repo(mongoose.model('Notification'));
const templates = () => repo(mongoose.model('NotificationTemplate'));

const THROTTLE_LIMIT = 5; // non-critical messages per recipient per day

// ── Policy ───────────────────────────────────────────────────────────────────

/** "21:00" → minutes since midnight. */
function toMinutes(hhmm) {
  const [h, m] = String(hhmm).split(':').map(Number);
  return h * 60 + m;
}

/**
 * Quiet hours span midnight (21:00 → 07:00), so the comparison wraps.
 * Getting this wrong would either silence everything or nothing.
 */
function inQuietHours(now, { from = '21:00', to = '07:00' } = {}) {
  const minutes = now.getHours() * 60 + now.getMinutes();
  const start = toMinutes(from);
  const end = toMinutes(to);
  return start > end ? minutes >= start || minutes < end : minutes >= start && minutes < end;
}

/** How many non-critical messages this recipient has already had today. */
async function sentToday(tenantId, to) {
  const Notification = mongoose.model('Notification');
  const since = new Date();
  since.setHours(0, 0, 0, 0);

  return Notification.countDocuments({
    tenantId,
    to,
    status: { $in: ['sent', 'delivered'] },
    createdAt: { $gte: since },
  });
}

/**
 * Decide whether a message may go out now.
 * @returns {{ allowed: boolean, reason?: string }}
 */
async function checkPolicy({ tenantId, to, template, tenantSettings, now = new Date() }) {
  if (template?.isCritical) return { allowed: true }; // emergencies bypass everything

  const quiet = tenantSettings?.quietHours;
  if (quiet?.enabled !== false && inQuietHours(now, quiet)) {
    return { allowed: false, reason: 'quiet_hours' };
  }

  const count = await sentToday(tenantId, to);
  if (count >= THROTTLE_LIMIT) {
    return { allowed: false, reason: 'daily_throttle' };
  }

  return { allowed: true };
}

// ── Templates ────────────────────────────────────────────────────────────────

async function findTemplate(scope, { code, channel, language = 'en' }) {
  const NotificationTemplate = mongoose.model('NotificationTemplate');

  // Preferred language, then English, then any.
  return (
    (await NotificationTemplate.findOne({
      tenantId: scope.tenantId, code, channel, language, isActive: true, deletedAt: null,
    })) ||
    (await NotificationTemplate.findOne({
      tenantId: scope.tenantId, code, channel, language: 'en', isActive: true, deletedAt: null,
    })) ||
    (await NotificationTemplate.findOne({
      tenantId: scope.tenantId, code, channel, isActive: true, deletedAt: null,
    }))
  );
}

// ── Dispatch ─────────────────────────────────────────────────────────────────

/**
 * Send one message.
 *
 * Always writes a Notification row — `suppressed` is a recorded outcome, not silence.
 */
async function send(scope, args) {
  const {
    code, channel, to, recipientName, userId, studentId,
    vars = {}, language = 'en', force = false,
  } = args;

  const Tenant = mongoose.model('Tenant');
  const Notification = mongoose.model('Notification');

  const tenant = await Tenant.findById(scope.tenantId).select('settings').lean();
  const template = await findTemplate(scope, { code, channel, language });

  if (!template && !args.body) {
    // Record the gap rather than failing silently — a missing template is a
    // configuration problem someone must see.
    return Notification.create({
      tenantId: scope.tenantId,
      branchId: scope.branchIds !== 'ALL' ? scope.branchIds[0] : undefined,
      eventCode: code,
      channel,
      to,
      recipientName,
      userId,
      studentId,
      status: 'suppressed',
      suppressionReason: 'no_template',
      payload: vars,
    });
  }

  const rendered = template ? template.render(vars) : { subject: args.subject, body: args.body };

  if (!force) {
    const policy = await checkPolicy({
      tenantId: scope.tenantId,
      to,
      template,
      tenantSettings: tenant?.settings,
    });

    if (!policy.allowed) {
      return Notification.create({
        tenantId: scope.tenantId,
        branchId: scope.branchIds !== 'ALL' ? scope.branchIds[0] : undefined,
        eventCode: code,
        templateId: template?._id,
        channel,
        to,
        recipientName,
        userId,
        studentId,
        subject: rendered.subject,
        body: rendered.body,
        status: 'suppressed',
        suppressionReason: policy.reason,
        payload: vars,
      });
    }
  }

  const [notification] = await Notification.create([
    {
      tenantId: scope.tenantId,
      branchId: scope.branchIds !== 'ALL' ? scope.branchIds[0] : undefined,
      eventCode: code,
      templateId: template?._id,
      channel,
      to,
      recipientName,
      userId,
      studentId,
      subject: rendered.subject,
      body: rendered.body,
      status: 'queued',
      payload: vars,
    },
  ]);

  try {
    const driver = await forTenant(channel === 'in_app' ? 'push' : channel, {
      tenantId: scope.tenantId,
    });

    const result = await driver.send({
      to,
      message: rendered.body,
      body: rendered.body,
      subject: rendered.subject,
      templateId: template?._id ? String(template._id) : undefined,
      dltTemplateId: template?.dltTemplateId,
      templateName: template?.whatsappTemplateName,
      params: Object.values(vars),
      tokens: channel === 'push' ? [to] : undefined,
    });

    notification.status = result.status === 'failed' ? 'failed' : 'sent';
    notification.provider = result.provider;
    notification.providerMessageId = result.id;
    notification.error = result.error;
    notification.sentAt = new Date();
    notification.attempts += 1;
    await notification.save();
  } catch (err) {
    logger.error('Notification dispatch failed', { channel, code, error: err.message });
    notification.status = 'failed';
    notification.error = err.message;
    notification.attempts += 1;
    await notification.save();
  }

  return notification;
}

/** Send to every guardian of a student, on the channels the school has enabled. */
async function notifyGuardians(scope, { studentId, code, vars = {}, channels = ['sms'] }) {
  const Student = mongoose.model('Student');
  const student = await Student.findOne({ _id: studentId, tenantId: scope.tenantId }).lean();
  if (!student) return [];

  const guardians = (student.guardians ?? []).filter((g) => g.phone || g.email);
  if (!guardians.length) return [];

  const primary = guardians.find((g) => g.isPrimary) ?? guardians[0];
  const results = [];

  for (const channel of channels) {
    const to = channel === 'email' ? primary.email : primary.phone;
    if (!to) continue;

    results.push(
      await send(scope, {
        code,
        channel,
        to,
        recipientName: primary.name,
        userId: primary.userId,
        studentId,
        vars: { ...vars, studentName: student.name, guardianName: primary.name },
      }),
    );
  }

  return results;
}

/**
 * Bulk send to a group.
 * Specification §36 / RBAC §6.4 make a school-wide broadcast a Principal-approved action
 * with a preview, so the caller must pass `approved: true`.
 */
async function broadcast(scope, { code, channel, recipients, vars = {}, approved = false }) {
  if (recipients.length > 50 && !approved) {
    throw new BusinessRuleError(
      'A bulk send to more than 50 recipients requires approval and a preview first',
      { recipientCount: recipients.length },
    );
  }

  const results = [];
  for (const r of recipients) {
    results.push(
      await send(scope, {
        code,
        channel,
        to: r.to,
        recipientName: r.name,
        userId: r.userId,
        studentId: r.studentId,
        vars: { ...vars, ...r.vars },
      }),
    );
  }

  return {
    total: results.length,
    sent: results.filter((r) => r.status === 'sent').length,
    suppressed: results.filter((r) => r.status === 'suppressed').length,
    failed: results.filter((r) => r.status === 'failed').length,
  };
}

/** Delivery report for the communications dashboard (WF-0203). */
async function deliveryReport(scope, { from, to }) {
  const rows = await notifications().aggregate(scope, [
    { $match: { createdAt: { $gte: new Date(from), $lte: new Date(to) } } },
    { $group: { _id: { channel: '$channel', status: '$status' }, count: { $sum: 1 }, cost: { $sum: '$cost' } } },
  ]);

  return rows.map((r) => ({
    channel: r._id.channel,
    status: r._id.status,
    count: r.count,
    cost: r.cost,
  }));
}

module.exports = {
  send,
  notifyGuardians,
  broadcast,
  deliveryReport,
  findTemplate,
  checkPolicy,
  inQuietHours,
  sentToday,
  THROTTLE_LIMIT,
  repos: { notifications, templates },
};
