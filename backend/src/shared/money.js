/**
 * Money — integer paise only.
 *
 * Architecture §10.4 / ADR-07. Floating-point rupees cannot satisfy the acceptance
 * criterion "daily collection report matches the gateway settlement within ₹1", so every
 * stored amount is an integer number of paise and all arithmetic happens here.
 */

const PAISE_PER_RUPEE = 100;

/** ₹123.45 → 12345 */
function fromRupees(rupees) {
  if (rupees === null || rupees === undefined || rupees === '') return 0;
  const n = Number(rupees);
  if (Number.isNaN(n)) throw new Error(`Not a number: ${rupees}`);
  return Math.round(n * PAISE_PER_RUPEE);
}

/** 12345 → 123.45 */
function toRupees(paise) {
  return assertPaise(paise) / PAISE_PER_RUPEE;
}

function assertPaise(v) {
  const n = Number(v ?? 0);
  if (!Number.isInteger(n)) {
    throw new Error(`Money must be integer paise, received ${v}`);
  }
  return n;
}

const add = (...values) => values.reduce((s, v) => s + assertPaise(v), 0);

function subtract(a, b) {
  return assertPaise(a) - assertPaise(b);
}

/** Multiply by a rate, rounding half-up. */
function multiply(paise, factor) {
  return Math.round(assertPaise(paise) * Number(factor));
}

/** percentOf(10000, 15) → 1500 (15% of ₹100.00) */
function percentOf(paise, percent) {
  return Math.round((assertPaise(paise) * Number(percent)) / 100);
}

/**
 * GST on a tax-exclusive amount.
 * Tuition is exempt (rate 0); transport, hostel, mess and uniform are taxable —
 * specification §10.5.
 */
function gstOn(amountPaise, ratePercent) {
  const gst = percentOf(amountPaise, ratePercent || 0);
  return { base: assertPaise(amountPaise), gst, total: add(amountPaise, gst) };
}

/** Split a tax-inclusive amount back into base and GST. */
function gstInclusive(totalPaise, ratePercent) {
  const rate = Number(ratePercent || 0);
  const base = Math.round(assertPaise(totalPaise) / (1 + rate / 100));
  return { base, gst: subtract(totalPaise, base), total: assertPaise(totalPaise) };
}

/**
 * Distribute an amount across weighted buckets so the parts always sum EXACTLY to the
 * whole. Used to allocate a partial fee payment across components without losing a paisa
 * to rounding.
 */
function allocate(totalPaise, weights) {
  const total = assertPaise(totalPaise);
  const sum = weights.reduce((s, w) => s + w, 0);
  if (sum <= 0) return weights.map(() => 0);

  const raw = weights.map((w) => (total * w) / sum);
  const floored = raw.map(Math.floor);
  let remainder = total - floored.reduce((s, v) => s + v, 0);

  // Hand the remaining paise to the largest fractional parts first.
  const order = raw
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac);

  const out = [...floored];
  for (let k = 0; remainder > 0; k += 1, remainder -= 1) {
    out[order[k % order.length].i] += 1;
  }
  return out;
}

/**
 * Indian formatting with lakh/crore grouping — specification §2.5.
 * format(123456789) → '₹12,34,567.89'
 */
function format(paise, { symbol = '₹', decimals = 2 } = {}) {
  const value = toRupees(paise);
  const negative = value < 0;
  const abs = Math.abs(value);

  const [whole, frac = ''] = abs.toFixed(decimals).split('.');

  // Last three digits, then groups of two.
  let grouped;
  if (whole.length <= 3) {
    grouped = whole;
  } else {
    const last3 = whole.slice(-3);
    const rest = whole.slice(0, -3);
    grouped = `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${last3}`;
  }

  const out = `${symbol}${grouped}${decimals ? `.${frac}` : ''}`;
  return negative ? `-${out}` : out;
}

/** Compact display for dashboards: ₹1.2Cr / ₹3.4L / ₹5.6K */
function formatCompact(paise) {
  const r = toRupees(paise);
  const abs = Math.abs(r);
  const sign = r < 0 ? '-' : '';
  if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toFixed(1)}Cr`;
  if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(1)}L`;
  if (abs >= 1e3) return `${sign}₹${(abs / 1e3).toFixed(1)}K`;
  return format(paise, { decimals: 0 });
}

module.exports = {
  PAISE_PER_RUPEE,
  fromRupees,
  toRupees,
  assertPaise,
  add,
  subtract,
  multiply,
  percentOf,
  gstOn,
  gstInclusive,
  allocate,
  format,
  formatCompact,
};
