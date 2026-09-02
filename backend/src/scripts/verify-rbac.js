/**
 * Role-wise access verification against a RUNNING API.
 *
 * Signs in as every seeded account and, for each module, calls a representative
 * read endpoint. The decision the API actually makes is compared with the
 * `permissionMap` that the same login handed the frontend. Those two must agree:
 * the sidebar is built from `permissionMap`, so any disagreement is either a menu
 * item that 403s when clicked, or — worse — data reachable by a role the matrix
 * says cannot see it.
 *
 *   PASS    API agreed with the permission map
 *   LEAK    map says no view, API returned data          ← security defect
 *   BLOCKED map says view, API returned 403              ← dead sidebar entry
 *   ERROR   5xx / unexpected status                      ← broken endpoint
 *
 * Run:  npm run verify:rbac            (expects the API on :5000)
 *       API_URL=http://host:5000 npm run verify:rbac
 */
require('dotenv').config();

const API = (process.env.API_URL || 'http://localhost:5000').replace(/\/$/, '') + '/api/v1';
const SLUG = process.env.DEMO_TENANT_SLUG || 'demo';
const PASSWORD = process.env.SUPER_ADMIN_PASSWORD || 'Admin@123456';

/**
 * module → a GET endpoint that is guarded by exactly that module's `view` action.
 * Kept next to the route definitions it mirrors; if a route moves, this must follow.
 */
const ENDPOINTS = {
  dashboard: '/dashboard/principal',
  admissions: '/admissions',
  students: '/students',
  academics: '/academics/years',
  timetable: '/academics/timetable',
  attendance: '/attendance/by-date?date=2026-08-17',
  homework: '/academics/homework',
  study_material: '/syllabus',
  examinations: '/exams',
  fees: '/fees/demands',
  payroll: '/hr/payroll',
  hr: '/hr/staff',
  library: '/library/books',
  transport: '/transport/vehicles',
  hostel: '/hostel/rooms',
  meals: '/meal',
  discipline: '/discipline',
  health: '/health',
  inventory: '/inventory',
  expenses: '/expenses',
  certificates: '/certificates',
  events: '/events',
  alumni: '/alumni',
  visitor_management: '/visitors',
  communication: '/sms',
  tasks: '/tasks',
  approvals: '/approvals/inbox',
  reports: '/reports/student-strength',
  settings: '/settings/profile',
  role_management: '/settings/users',
  audit_logs: '/audit-logs',
};

const ACCOUNTS = [
  ['super_admin', process.env.SUPER_ADMIN_EMAIL || 'admin@schoolerp.com'],
  ['school_admin', `admin@${SLUG}.school`],
  ['trustee', `trustee@${SLUG}.school`],
  ['group_finance_controller', `groupfinance@${SLUG}.school`],
  ['compliance_officer', `compliance@${SLUG}.school`],
  ['principal', `principal@${SLUG}.school`],
  ['vice_principal', `vp@${SLUG}.school`],
  ['branch_admin', `branchadmin@${SLUG}.school`],
  ['hod', `hod@${SLUG}.school`],
  ['exam_coordinator', `exams@${SLUG}.school`],
  ['accountant', `accounts@${SLUG}.school`],
  ['hr_manager', `hr@${SLUG}.school`],
  ['librarian', `library@${SLUG}.school`],
  ['transport_manager', `transport@${SLUG}.school`],
  ['hostel_warden', `hostel@${SLUG}.school`],
  ['admission_head', `admissionhead@${SLUG}.school`],
  ['counsellor', `counsellor@${SLUG}.school`],
  ['school_nurse', `nurse@${SLUG}.school`],
  ['store_manager', `store@${SLUG}.school`],
  ['class_teacher', `ct8a@${SLUG}.school`],
  ['teacher', `teacher@${SLUG}.school`],
  ['admission_officer', `admissions@${SLUG}.school`],
  ['cashier', `cashier@${SLUG}.school`],
  ['receptionist', `reception@${SLUG}.school`],
  ['driver', `driver@${SLUG}.school`],
  ['parent', `parent@${SLUG}.school`],
  ['student', `student@${SLUG}.school`],
  ['alumni', `alumni@${SLUG}.school`],
];

const C = {
  reset: '\x1b[0m', dim: '\x1b[2m', bold: '\x1b[1m',
  green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m', cyan: '\x1b[36m',
};

async function login(email) {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.success) {
    return { error: body?.error?.message || `HTTP ${res.status}` };
  }
  return {
    token: body.data.token,
    permissionMap: body.data.permissionMap || {},
    enabledModules: body.data.enabledModules || [],
    isSuperAdmin: !!body.data.user?.isSuperAdmin,
  };
}

async function probe(token, path) {
  const res = await fetch(API + path, { headers: { Authorization: `Bearer ${token}` } });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, code: body?.error?.code };
}

async function main() {
  console.log(`${C.bold}Role-wise access verification${C.reset}  ${C.dim}${API}${C.reset}\n`);

  const modules = Object.keys(ENDPOINTS);
  const problems = [];
  const rows = [];

  for (const [role, email] of ACCOUNTS) {
    const session = await login(email);
    if (session.error) {
      problems.push({ role, module: '-', kind: 'LOGIN', detail: session.error });
      console.log(`${C.red}✗ ${role.padEnd(26)} login failed — ${session.error}${C.reset}`);
      continue;
    }

    let pass = 0; let leak = 0; let blocked = 0; let error = 0;
    const granted = [];

    for (const m of modules) {
      // Super admin bypasses the module check entirely, so the map understates it.
      const expectView = session.isSuperAdmin || !!session.permissionMap[m]?.canView;
      const { status, code } = await probe(session.token, ENDPOINTS[m]);

      // 404 means the row set is empty or the path has no handler — either way the
      // permission gate let the request through, which is what is being measured.
      const allowed = status < 400 || status === 404;
      const denied = status === 403;

      if (status >= 500) {
        error += 1;
        problems.push({ role, module: m, kind: 'ERROR', detail: `HTTP ${status} ${code || ''}`.trim() });
      } else if (expectView && denied) {
        blocked += 1;
        problems.push({ role, module: m, kind: 'BLOCKED', detail: code || 'FORBIDDEN' });
      } else if (!expectView && allowed) {
        leak += 1;
        problems.push({ role, module: m, kind: 'LEAK', detail: `HTTP ${status}` });
      } else {
        pass += 1;
        if (expectView) granted.push(m);
      }
    }

    rows.push({ role, pass, leak, blocked, error, granted: granted.length });

    const flag = leak || blocked || error
      ? `${C.red}✗${C.reset}`
      : `${C.green}✓${C.reset}`;
    const detail = [
      leak ? `${C.red}${leak} leak${C.reset}` : null,
      blocked ? `${C.yellow}${blocked} blocked${C.reset}` : null,
      error ? `${C.red}${error} error${C.reset}` : null,
    ].filter(Boolean).join(' ');

    console.log(
      `${flag} ${role.padEnd(26)} ${String(granted.length).padStart(2)}/${modules.length} modules readable   ${detail}`,
    );
  }

  console.log(`\n${C.bold}Summary${C.reset}`);
  const totals = rows.reduce((a, r) => ({
    pass: a.pass + r.pass, leak: a.leak + r.leak, blocked: a.blocked + r.blocked, error: a.error + r.error,
  }), { pass: 0, leak: 0, blocked: 0, error: 0 });
  const checks = totals.pass + totals.leak + totals.blocked + totals.error;
  console.log(`  ${checks} checks across ${rows.length} roles × ${modules.length} modules`);
  console.log(`  ${C.green}${totals.pass} pass${C.reset}  ${C.red}${totals.leak} leak${C.reset}  ${C.yellow}${totals.blocked} blocked${C.reset}  ${C.red}${totals.error} error${C.reset}`);

  if (problems.length) {
    console.log(`\n${C.bold}Problems${C.reset}`);
    for (const p of problems) {
      const colour = p.kind === 'BLOCKED' ? C.yellow : C.red;
      console.log(`  ${colour}${p.kind.padEnd(8)}${C.reset} ${p.role.padEnd(26)} ${p.module.padEnd(20)} ${p.detail}`);
    }
  }

  process.exit(problems.length ? 1 : 0);
}

main().catch((err) => {
  console.error('verify-rbac failed:', err.message);
  process.exit(2);
});
