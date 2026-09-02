# CLAUDE.md — School ERP

Guide for AI coding sessions working in this repo. Read this first; it points to the deeper source docs so you don't have to rediscover them.

## What this is

A multi-tenant SaaS School ERP for the Indian education market (CBSE / ICSE / IB / State Boards, incl. Govt/Aided schools). Covers the full school lifecycle: admissions → academics/timetable → attendance → fees/payroll → exams/results → transport/hostel/library/inventory → communication (SMS/WhatsApp/Email) → compliance (DPDP Act 2023, RTE 25%, UDISE+, GST) → alumni.

## Source-of-truth docs — read the right one for the question you have

| Question | Document |
|---|---|
| **"What are we building, in what order, and what's already broken?"** | **`docs/feature-brainstorm.md`** — scope definition, locked decisions, module inventory, confirmed defect list, delivery plan. **Read this first.** |
| **"How is it built / how should I build this?"** | **`docs/architecture/system-architecture.md`** — authoritative technical design. Where it disagrees with the root `.docx` files, this wins for current-state work. |
| **"How do I know it works?"** | **`docs/verification/e2e-verification.md`** — regression suite for known defects, cross-cutting RBAC/scope suites, per-module checklists, go-live gate. |
| "What should this feature do, for whom?" (business rules, Indian-context specifics) | `Enterprise_School_ERP_Indian_Specification_v2.md` (818 lines, 38 sections — plaintext, read this one, not the `.docx` twin) |
| "Who is allowed to do this, with what scope?" (roles, permission matrix, approval workflows) | `RBAC_Permission_Architecture_Plan.md` (1699 lines — the authoritative RBAC model) |
| "What's the overall system architecture / vision?" | `Enterprise_School_ERP Plan.docx` (docx only — open via the `docx` skill if needed) |
| "What does screen X look like / what screens exist for role Y?" | `Enterprise_School_ERP Wireframe.docx` (docx only, screen-by-screen inventory) |
| "What's the exact REST contract?" | `docs/architecture/openapi.yaml` |
| "How does flow X actually work end-to-end (sequence, events, edge cases)?" | `docs/workflows/{admission,attendance,fee-collection}-flow.md` |

Don't re-derive business rules or role definitions from scratch — they're already specified in the two markdown docs above. Treat code as the source of truth for *how it's actually implemented today*, and the docs as the source of truth for *what it's supposed to do*. When they disagree, flag it rather than silently picking one.

## Tech stack

**Backend** (`backend/`) — Node.js ≥20, Express 4.19, MongoDB via Mongoose 8.4, JWT auth (`jsonwebtoken` + `bcryptjs`), `zod` validation, `helmet`/`cors`/`compression`/`express-rate-limit`, `winston` (app log) + `morgan` (HTTP log), `multer` (uploads), `exceljs`/`pdfmake` (exports), CommonJS, npm.

**Frontend** (`frontend/`) — React 18.3 + TypeScript 5.5 on Vite 5.3, `react-router-dom` v6, `zustand` (client state) + `@tanstack/react-query` v5 (server state), `react-hook-form` + `zod` (forms), `axios` (`src/lib/api.ts`), Tailwind CSS, `lucide-react` icons.

## Repo layout

```
backend/src/
  routes/        one <domain>.routes.js per business module, all mounted in routes/index.js under /api/v1
  controllers/   one <domain>.controller.js per module, mirrors routes/
  models/        Mongoose schemas, one per entity (34 models: Tenant, Branch, Student, Staff, FeeStructure, ...)
  middleware/    auth.js (JWT), rbac.js (permission engine + audit logging), studentScope.js, errorHandler.js, requestId.js
  config/        database.js (Mongoose connect), logger.js (winston)
  shared/        response.js (sendSuccess/sendError/pagination helpers), errors.js (AppError + subclasses)
  utils/         PDF/Excel export helpers, certificate generation
  scripts/       seed.js, seed-full.js, seed-permissions.js, seed-portal-users.js — there is no migrations system
  modules/       empty (.gitkeep only) — placeholder for a future modular refactor, not in use yet

frontend/src/
  pages/<module>/     one folder per domain, mirrors backend routes 1:1 (students, fees, exams, hr, library, transport, hostel, admissions, communication, frontoffice, superadmin, audit, approvals, reports, settings, ...)
  services/<x>.service.ts   thin wrapper per domain around lib/api.ts (get/post/put/patch/del)
  stores/         zustand stores, notably auth.store.ts (token, user, permissionMap, enabledModules, can()/hasModule())
  components/     ui/, auth/ (RequireAuth, ModuleRoute), layout/
  config/         portalNav.tsx (per-portal sidebar menus), moduleAliases.ts (RBAC module key → tenant plan module key mapping)
  types/           shared TS types

docs/
  architecture/openapi.yaml
  workflows/{admission,attendance,fee-collection}-flow.md
```

New features should slot into this existing one-module-one-folder pattern on both sides rather than introducing a new structure.

## Running locally

```
# Backend
cd backend
npm install
cp .env.example .env      # NOT ".env .eample" — a stray mis-typed file, ignore/delete it if you see it
npm run dev                # nodemon src/server.js — http://localhost:5000, MONGODB_URI defaults to mongodb://localhost:27017/school-erp
npm run seed                # or seed:full — seeds Tenant/Plan/roles/permissions/demo data (incl. SUPER_ADMIN_EMAIL/PASSWORD from .env)

# Frontend
cd frontend
npm install
npm run dev                # vite — http://localhost:3000, proxies /api -> http://localhost:5000
```

No root-level `package.json` — the two apps are independent npm projects, install/run separately. There is no root README; this file plus the docs above are the closest thing to one.

## Data & multi-tenancy

- MongoDB/Mongoose, no formal migrations — schema evolves via the Mongoose schemas directly plus the seed scripts in `backend/src/scripts/`.
- Every tenant-scoped collection carries `tenantId` (and usually `branchId`); `Tenant` model holds SaaS plan, `enabledModules`, `featureOverrides`, billing, and integration config (Razorpay/Cashfree/MSG91/WhatsApp/SMTP).
- JWT payload shape: `{ userId, tenantId, branchId, role, roles, permissions, isSuperAdmin, email, name }`. `middleware/auth.js#authenticate` verifies and attaches it to `req.user` / `req.tenantId`.
- Frontend mirrors this: `enabledModules` (tenant plan gating, via `moduleAliases.ts`) is distinct from `permissionMap` (per-role RBAC), and `auth.store.ts#hasModule()` checks the former while `#can()`/`#canAccessModule()` check the latter — a feature needs *both* to be true to be usable.

## Auth & RBAC model

Full detail in `RBAC_Permission_Architecture_Plan.md`; the condensed version you need day-to-day:

- Permission = 4-tuple `(Role, Module, Action, Scope)`. Actions: `view/add/edit/delete/approve/export`. Scope dimensions: `branchScope` (`all_branches`/`assigned_branches`/`own_branch`), `dataScope` (`own`/`department`/`division`/`school`/`group`), `studentScope` (`own_children`/`assigned_students`/`all`), `temporal_scope` (`current_ay`/`historical_read`).
- ~34 roles across 6 tiers: Tier 0 SaaS Super Admin → Tier 1 Group/Trust (Trustee, Group Academic Director, Group Finance Controller, Compliance Officer) → Tier 2 Branch Leadership (Branch Admin, Principal, VP, Academic Coordinator) → Tier 3 Dept/Functional Heads (HoD, Exam Coordinator, Accountant, Cashier, HR Manager, Transport/Hostel/Library/Store managers, ...) → Tier 4 Operational Staff (Class Teacher, Subject Teacher, Receptionist, Driver, ...) → Tier 5 External/Portal (Parent, Student, Alumni). Full list + reporting lines in the RBAC doc's Section 1.
- Multi-role resolution: additive actions (view/add/edit/approve/export) → union, most permissive wins; destructive actions on sensitive modules (Fees/Payroll/Marks/Certificates) → most restrictive wins.
- **Backend enforcement**: `router.use(authenticate, applyBranchScope)` then per-route `checkPermission(module, action)` from `middleware/rbac.js`. It looks up `Permission` by `{role, module}` (5-min in-memory cache), 403s if missing/insufficient, and attaches `req.rbacScope` for controllers to apply data filtering. `super_admin` role bypasses all module checks. Wrap sensitive mutations with `audit(module, action)` — it writes an `AuditLog` entry on response (fire-and-forget, never blocks the request); see `CRITICAL_ACTIONS` in `rbac.js` for what's tagged `severity: 'critical'`.
- **Frontend enforcement**: `auth.store.ts` holds `permissionMap` (per-module `canView/canAdd/.../branchScope/...`) and `enabledModules` from login. `can(module, action)`, `canAccessModule(module)`, `hasModule(module)` gate UI; `<ModuleRoute module="fees" action="edit">` (in `components/auth/ModuleRoute.tsx`) guards routes in `App.tsx`, `<RequireAuth>`/`<RequireSuperAdmin>` gate broader areas. Sidebar items in `portalNav.tsx` carry `module`/`action` and are filtered the same way.
- Approval workflows (fee concession, staff leave, payroll release, mark correction, certificate issuance, expense approval, inventory request, branch transfer, admission) are documented in the RBAC doc's Section 5 — these are what the `approve` action and `ApprovalRequest` model back.

## API conventions

- All routes mounted under `/api/v1` (see `backend/src/routes/index.js` for the full path→router map; e.g. `/fees`, `/students`, `/exams`, `/hr`, `/payroll`, `/hostel`, `/transport`, `/library`, `/inventory`, `/certificates`, `/approvals`, `/audit-logs`).
- Auth: `Authorization: Bearer <token>`. Multi-tenant headers: `X-Tenant-Id` (super-admin impersonation), `X-Branch-Id`, `X-Request-Id`. Idempotency-key header expected on payment/admission endpoints (see `docs/workflows/admission-flow.md` and `fee-collection-flow.md`).
- Response shape: use `shared/response.js` — `sendSuccess(res, data, message?, statusCode?, meta?)`, `sendCreated`, `sendError(res, statusCode, code, message, details?)`, `buildPaginationMeta`/`parsePagination`. Success body is `{ success: true, data, message?, meta? }`; error body is `{ success: false, error: { code, message, details } }`.
- Errors: throw `shared/errors.js` classes (`ValidationError`, `NotFoundError`, `UnauthorizedError`, `ForbiddenError`, `BadRequestError`, `ConflictError`) — `express-async-errors` + the global `errorHandler` middleware turn these into the response shape above automatically; don't hand-roll try/catch + res.status in controllers.
- Frontend calls go through `src/lib/api.ts`'s typed `get/post/put/patch/del` helpers (never raw `axios` in a service file) — see `services/student.service.ts` for the pattern.

## Two layers coexist — read this before touching a route

The backend is mid-migration (architecture §21). **New modules live in `backend/src/modules/`
and are mounted BEFORE the legacy routers**, so their routes win and anything they do not
define falls through to the old controller. Both layers run side by side; nothing was cut
over at once.

| Layer | Where | Auth | Scoping | Validation |
|---|---|---|---|---|
| **New** (`modules/`) | `modules/<name>/` | `platform/auth/authenticate` → `req.principal` | `guard()` → `req.scope` → `BaseRepository` (mandatory) | zod per route |
| **Legacy** (`controllers/`) | `controllers/`, `routes/` | `middleware/auth` → `req.user` | none — `tenantId` only | none |

Built as modules: **identity, academics, fees, approvals, exams, attendance, communication.**
Everything else is still legacy. When you touch a legacy area, port it to a module rather
than patching in place — and never add a new route to the legacy layer.

**Data access rule:** in a module, never call a Mongoose model directly. Use
`repo(Model)` from `infra/repository/BaseRepository` and pass `req.scope`. The repository
has no un-scoped API, which is the point.

## Known gaps / gotchas

- **Test suite: `cd backend && npm test`** — Vitest against an in-memory MongoDB replica
  set (a replica set specifically: transactions do not work on a standalone `mongod`).
  ~180 tests across 10 files. `tests/setup.js` lowers bcrypt to cost 4; production uses 12.
- **MongoDB must run as a replica set**, or fee collection, payroll and enrolment cannot be
  atomic. `mongod --replSet rs0` then `rs.initiate()`. `/health/ready` reports this.
- **`npm run lint` was broken** (ESLint 9 needs flat config, none existed) — fixed by adding minimal `eslint.config.js` to both `backend/` and `frontend/`. It now also enforces that `Scope.system()` appears only in `*.jobs.js` / `*.events.js`.
- **Frontend route guards are declared as data** in `src/config/routeRegistry.ts`. Adding a
  route without an entry there makes it render the 403 state — deliberately.
- Integrations default to a **`noop` driver**: development runs with zero credentials and
  logs what would have been sent. An integration is live only when `enabled === true`.
- No root README — this file is the closest equivalent.
- `RBAC_Permission_Architecture_Plan copy.md` was a byte-identical duplicate of `RBAC_Permission_Architecture_Plan.md` — removed. Use the non-`copy` file.
- `backend/.env .eample` was a mis-typed duplicate of `backend/.env.example` — removed. Use `.env.example`.

## Skills

Three skills live in `.claude/skills/` for feature work on this repo, meant to be used in sequence:

1. **`feature-brainstorming`** — scope a new/changed feature against the functional spec, RBAC roles, and existing modules before any code is written.
2. **`feature-implementation-plan`** — turn a scoped feature into a concrete backend+frontend build plan following this repo's conventions.
3. **`feature-e2e-verification`** — manually verify a finished feature end-to-end (backend, RBAC, frontend, spec alignment), since there's no automated test suite.
