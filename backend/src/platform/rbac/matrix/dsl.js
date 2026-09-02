/**
 * A tiny DSL for expressing the permission matrix compactly.
 *
 *   P('vae', { d: 'division' })   → view + add + edit, dataScope 'division'
 *   P('')                          → no access
 *
 * Letters: v=view a=add e=edit d=delete p=approve x=export
 * Scope keys: b=branchScope  d=dataScope  s=studentScope  t=temporalScope
 *
 * Architecture §20: this matrix is the source for BOTH the seed and the generated RBAC
 * tests, so tests cannot drift from configuration.
 */
const { ACTION_CODE, ACTION_FIELD } = require('../actions');

const DEFAULTS = { b: 'own_branch', d: 'school', s: 'all', t: 'current_ay' };

function P(letters = '', scopes = {}) {
  const s = { ...DEFAULTS, ...scopes };
  const granted = new Set(
    String(letters)
      .split('')
      .map((ch) => ACTION_CODE[ch])
      .filter(Boolean),
  );

  const perm = {
    canView: granted.has('view'),
    canAdd: granted.has('add'),
    canEdit: granted.has('edit'),
    canDelete: granted.has('delete'),
    canApprove: granted.has('approve'),
    canExport: granted.has('export'),
    branchScope: s.b,
    dataScope: s.d,
    studentScope: s.s,
    temporalScope: s.t,
  };

  // No granted action means no access at all — normalise the scopes so a "none" row can
  // never accidentally widen anything.
  if (granted.size === 0) {
    perm.branchScope = 'none';
    perm.dataScope = 'none';
    perm.studentScope = 'none';
  }

  const unknown = String(letters)
    .split('')
    .filter((ch) => !ACTION_CODE[ch]);
  if (unknown.length) {
    throw new Error(`Unknown permission letter(s) "${unknown.join('')}" — valid: v a e d p x`);
  }

  return perm;
}

/** No access. */
const NONE = () => P('');
/** Read-only. */
const VIEW = (scopes) => P('v', scopes);
/** Read + export — the common "reporting" shape. */
const READ = (scopes) => P('vx', scopes);
/** Create/read/update/delete + export, no approval authority. */
const FULL = (scopes) => P('vaedx', scopes);
/** Everything including approval. */
const MANAGE = (scopes) => P('vaedpx', scopes);
/** Approve + read only — reviewers who never author. */
const APPROVE = (scopes) => P('vpx', scopes);
/** Author but not delete — the safe default for operational staff. */
const CONTRIBUTE = (scopes) => P('vae', scopes);

/** Fill every unspecified module with NONE so a matrix row is always complete. */
function completeRow(row, modules) {
  const out = {};
  for (const m of modules) out[m] = row[m] || NONE();
  return out;
}

/** Convert one permission object into the boolean field a given action maps to. */
function allows(perm, action) {
  const field = ACTION_FIELD[action];
  if (!field) throw new Error(`Unknown action "${action}"`);
  return !!(perm && perm[field]);
}

module.exports = { P, NONE, VIEW, READ, FULL, MANAGE, APPROVE, CONTRIBUTE, completeRow, allows };
