/**
 * Default message templates, seeded per tenant.
 *
 * Each SMS carries a `dltTemplateId` placeholder that the school must replace with its own
 * TRAI-registered id — the adapter refuses to send without one, so the gap is visible at
 * configuration time rather than as silent non-delivery.
 */
const DEFAULT_TEMPLATES = [
  {
    code: 'ATTENDANCE_ABSENT',
    name: 'Absence alert',
    channel: 'sms',
    body: 'Dear {{guardianName}}, your ward {{studentName}} was marked absent on {{date}}. - {{schoolName}}',
    isTransactional: true,
  },
  {
    code: 'ATTENDANCE_LONG_ABSENCE',
    name: 'Long absence alert',
    channel: 'sms',
    body: 'Dear {{guardianName}}, {{studentName}} has been absent for {{days}} consecutive days. Please contact the school. - {{schoolName}}',
    isTransactional: true,
  },
  {
    code: 'INVOICE_CREATED',
    name: 'Fee invoice raised',
    channel: 'sms',
    body: 'Dear {{guardianName}}, fee invoice {{demandNo}} of {{amount}} for {{studentName}} is due on {{dueDate}}. - {{schoolName}}',
    isTransactional: true,
  },
  {
    code: 'FEE_REMINDER',
    name: 'Fee reminder',
    channel: 'sms',
    body: 'Dear {{guardianName}}, fees of {{amount}} for {{studentName}} are due on {{dueDate}}. Please pay to avoid a late fee. - {{schoolName}}',
    isTransactional: true,
  },
  {
    code: 'PAYMENT_RECEIVED',
    name: 'Payment receipt',
    channel: 'sms',
    body: 'Dear {{guardianName}}, we have received {{amount}} towards fees for {{studentName}}. Receipt {{receiptNo}}. - {{schoolName}}',
    isTransactional: true,
  },
  {
    code: 'WELCOME',
    name: 'Admission welcome',
    channel: 'sms',
    body: 'Welcome {{studentName}}! Admission confirmed at {{schoolName}}. Login details have been emailed to {{guardianName}}.',
    isTransactional: true,
  },
  {
    code: 'RESULT_PUBLISHED',
    name: 'Result published',
    channel: 'sms',
    body: 'Dear {{guardianName}}, results for {{examName}} are published. View {{studentName}}’s report card in the app. - {{schoolName}}',
    isTransactional: true,
  },
  {
    code: 'EMERGENCY',
    name: 'Emergency alert',
    channel: 'sms',
    body: 'EMERGENCY: vehicle {{vehicle}} on route {{route}} has raised an SOS. Immediate attention required.',
    isTransactional: true,
    isCritical: true,
  },
  {
    code: 'HOMEWORK_POSTED',
    name: 'Homework posted',
    channel: 'push',
    body: 'New {{subject}} homework for {{studentName}}, due {{dueDate}}.',
    isTransactional: true,
  },
  {
    code: 'BOOK_OVERDUE',
    name: 'Library book overdue',
    channel: 'sms',
    body: 'Dear {{guardianName}}, the book "{{bookTitle}}" issued to {{studentName}} is overdue. Fine so far: {{fine}}. - {{schoolName}}',
    isTransactional: true,
  },
];

/** Seed the defaults for a tenant. Idempotent. */
async function seedTemplates(tenantId, { force = false } = {}) {
  const mongoose = require('mongoose');
  const NotificationTemplate = mongoose.model('NotificationTemplate');

  const results = [];
  for (const def of DEFAULT_TEMPLATES) {
    const existing = await NotificationTemplate.findOne({
      tenantId, code: def.code, channel: def.channel, language: 'en', deletedAt: null,
    });

    if (existing && !force) {
      results.push({ code: def.code, action: 'skipped' });
      continue;
    }
    if (existing) {
      Object.assign(existing, def);
      await existing.save();
      results.push({ code: def.code, action: 'updated' });
    } else {
      await NotificationTemplate.create({ ...def, tenantId, language: 'en' });
      results.push({ code: def.code, action: 'created' });
    }
  }
  return results;
}

module.exports = { DEFAULT_TEMPLATES, seedTemplates };
