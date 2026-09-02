const js = require('@eslint/js');

const nodeGlobals = {
  require: 'readonly',
  module: 'writable',
  exports: 'writable',
  process: 'readonly',
  __dirname: 'readonly',
  __filename: 'readonly',
  console: 'readonly',
  Buffer: 'readonly',
  global: 'readonly',
  URL: 'readonly',
  URLSearchParams: 'readonly',
  fetch: 'readonly',
  setTimeout: 'readonly',
  setInterval: 'readonly',
  setImmediate: 'readonly',
  clearTimeout: 'readonly',
  clearInterval: 'readonly',
};

const vitestGlobals = {
  describe: 'readonly',
  it: 'readonly',
  test: 'readonly',
  expect: 'readonly',
  vi: 'readonly',
  beforeAll: 'readonly',
  afterAll: 'readonly',
  beforeEach: 'readonly',
  afterEach: 'readonly',
};

module.exports = [
  js.configs.recommended,
  {
    files: ['src/**/*.js', 'tests/**/*.js', '*.config.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'commonjs',
      globals: nodeGlobals,
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
  {
    // Tests run under Vitest with `globals: true` (Vitest 4 cannot be `require`d from CJS).
    files: ['tests/**/*.js', 'src/**/*.test.js'],
    languageOptions: { globals: { ...nodeGlobals, ...vitestGlobals } },
  },
  {
    // Domain modules must not reach for a cross-tenant scope (architecture §6.4).
    // Exempt: *.jobs.js and *.events.js — scheduled jobs and event subscribers both run
    // outside any request, so they have no req.scope to use and legitimately construct a
    // system scope with a stated reason.
    files: ['src/modules/**/*.js'],
    ignores: ['src/modules/**/*.jobs.js', 'src/modules/**/*.events.js'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "MemberExpression[object.name='Scope'][property.name='system']",
          message:
            'Scope.system() is not permitted in a domain module. Use req.scope, or move the ' +
            'work into <module>.jobs.js if it genuinely needs cross-tenant access.',
        },
      ],
    },
  },
  {
    ignores: ['node_modules/**', 'coverage/**', 'logs/**', 'uploads/**'],
  },
];
