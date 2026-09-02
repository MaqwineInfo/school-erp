/**
 * The module registry.
 *
 * Every domain module exports the same shape (architecture §9): routes, jobs, events,
 * a public `service` interface and the RBAC module keys it owns. Nothing else about a
 * module is importable from outside it.
 *
 * Modules are listed in dependency order — the order they were built in, which is also
 * the order the delivery plan specifies.
 */
const academics = require('./academics');
const studentsModule = require('./students');
const fees = require('./fees');
const approvals = require('./approvals');
const exams = require('./exams');
const attendance = require('./attendance');
const communication = require('./communication');
const identity = require('./identity');

const modules = [identity, academics, studentsModule, fees, approvals, exams, attendance, communication];

/** name → module, for cross-module service lookups. */
const byName = Object.fromEntries(modules.map((m) => [m.name, m]));

/** Register every module's event subscribers. Called once at boot. */
function wireSubscribers() {
  for (const mod of modules) {
    if (typeof mod.subscribe === 'function') mod.subscribe();
  }
}

module.exports = modules;
module.exports.byName = byName;
module.exports.wireSubscribers = wireSubscribers;
