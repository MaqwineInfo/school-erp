const mongoose = require('mongoose');

/**
 * A message template, per channel and per language.
 *
 * Specification §14 / architecture §12.2. The DLT template id is mandatory for SMS in
 * India: TRAI rejects unregistered templates at the carrier, which is a failure mode that
 * is otherwise invisible. Holding the id here lets the adapter refuse the send up front.
 */
const notificationTemplateSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },

    /** Matches a domain event name, or a manual code. */
    code: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String },

    channel: {
      type: String,
      enum: ['sms', 'whatsapp', 'email', 'push', 'in_app'],
      required: true,
    },
    language: { type: String, default: 'en' },

    subject: { type: String }, // email only
    /** Body with {{placeholders}} — e.g. "Dear {{guardianName}}, {{studentName}} was absent". */
    body: { type: String, required: true },

    /** TRAI / DLT registration (specification §36). */
    dltTemplateId: { type: String },
    dltEntityId: { type: String },
    senderId: { type: String },

    /** WhatsApp Business approved template name. */
    whatsappTemplateName: { type: String },

    /** Transactional messages bypass quiet hours and throttling. */
    isTransactional: { type: Boolean, default: true },
    /** Critical alerts (emergency, SOS) bypass everything. */
    isCritical: { type: Boolean, default: false },

    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

notificationTemplateSchema.index(
  { tenantId: 1, code: 1, channel: 1, language: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } },
);

/** Render the body against a payload. Missing keys render as an empty string. */
notificationTemplateSchema.methods.render = function render(vars = {}) {
  const fill = (text) =>
    String(text ?? '').replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => (vars[key] ?? '').toString());

  return { subject: fill(this.subject), body: fill(this.body) };
};

module.exports = mongoose.model('NotificationTemplate', notificationTemplateSchema);
