/**
 * Atomic document-number generation.
 *
 * Architecture §10.2. Fixes the receipt-number race: the previous implementation read the
 * highest existing receipt number, incremented it in JavaScript, and wrote — with no
 * unique index, no transaction and no retry, so two cashiers collecting at the same moment
 * produced the same number.
 *
 * `findOneAndUpdate` + `$inc` is atomic at the document level, which is the guarantee we
 * actually need. Callers should ALSO carry a unique index on the resulting number so a
 * future bug cannot double-issue silently.
 */
const mongoose = require('mongoose');

/** Indian financial year for a date: April–March. */
function financialYear(date = new Date()) {
  const y = date.getFullYear();
  const m = date.getMonth(); // 0-based; April = 3
  const start = m >= 3 ? y : y - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
}

/**
 * Reserve the next number in a counter.
 *
 * @param {object} args
 * @param {import('mongoose').Types.ObjectId} args.tenantId
 * @param {import('mongoose').Types.ObjectId} [args.branchId]  counters are per branch
 * @param {string} args.kind        receipt | tc | voucher | admission | indent | po
 * @param {string} [args.period]    defaults to the current financial year
 * @param {import('mongoose').ClientSession} [args.session]
 * @returns {Promise<number>}
 */
async function next({ tenantId, branchId = null, kind, period, session }) {
  if (!tenantId) throw new Error('sequence.next requires tenantId');
  if (!kind) throw new Error('sequence.next requires kind');

  const Sequence = mongoose.model('Sequence');
  const doc = await Sequence.findOneAndUpdate(
    { tenantId, branchId, kind, period: period ?? financialYear() },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true, session },
  );
  return doc.seq;
}

/**
 * Format a reserved number.
 *   format({ prefix: 'RCP', period: '2026-27', seq: 42 }) → 'RCP/2026-27/000042'
 */
function format({ prefix, period, seq, width = 6, separator = '/' }) {
  const parts = [prefix, period, String(seq).padStart(width, '0')].filter(
    (p) => p !== undefined && p !== null && p !== '',
  );
  return parts.join(separator);
}

/** Reserve and format in one step — the common case. */
async function nextFormatted({ tenantId, branchId, kind, period, prefix, width, separator, session }) {
  const p = period ?? financialYear();
  const seq = await next({ tenantId, branchId, kind, period: p, session });
  return { seq, period: p, number: format({ prefix, period: p, seq, width, separator }) };
}

/** Read the current value without consuming one. */
async function peek({ tenantId, branchId = null, kind, period }) {
  const Sequence = mongoose.model('Sequence');
  const doc = await Sequence.findOne({
    tenantId,
    branchId,
    kind,
    period: period ?? financialYear(),
  }).lean();
  return doc?.seq ?? 0;
}

module.exports = { next, nextFormatted, format, peek, financialYear };
