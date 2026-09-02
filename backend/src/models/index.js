/**
 * Registers every Mongoose model exactly once.
 *
 * Much of the codebase resolves models by name — `mongoose.model('Session')` — rather than
 * by requiring the file. That only works if something has already required it, and for
 * five models nothing ever did: `LoginAttempt`, `Session`, `UserRole`, `Sequence` and
 * `IdempotencyRecord` are referenced by name and required by no module, so in the running
 * server the first lookup threw MissingSchemaError. `bootstrap.js` and the test setup each
 * walk this directory themselves, which is why the failure never showed up in a seed or a
 * test run — only against a live server, where it made every login a 500.
 *
 * Requiring this module registers all of them. `config/database.js` does so at connect
 * time, which covers the server, the scripts and the tests alike.
 */
const fs = require('fs');
const path = require('path');

const registered = {};

for (const file of fs.readdirSync(__dirname)) {
  if (!file.endsWith('.js') || file === 'index.js') continue;
  const exported = require(path.join(__dirname, file));
  registered[path.basename(file, '.js')] = exported;
}

module.exports = registered;
