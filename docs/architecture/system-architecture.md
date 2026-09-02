# School ERP — System Architecture

**Status:** Draft for approval
**Date:** 2026-08-15
**Supersedes:** the architecture sections of `Enterprise_School_ERP Plan.docx` (§3, §21, §23) for current-state purposes
**Companion documents:** [`../feature-brainstorm.md`](../feature-brainstorm.md) · [`../verification/e2e-verification.md`](../verification/e2e-verification.md)

This is the authoritative technical design. Where it disagrees with any `.docx` in the
repository root, **this document wins** for anything being built now; the `.docx` files
remain the source of truth for functional behaviour and for the long-term scale-out target.

---

## Table of Contents

1. [Architectural principles](#1-architectural-principles)
2. [System context](#2-system-context)
3. [Runtime architecture](#3-runtime-architecture)
4. [Target repository layout](#4-target-repository-layout)
5. [Request lifecycle](#5-request-lifecycle)
6. [Multi-tenancy and the Scope Engine](#6-multi-tenancy-and-the-scope-engine)
7. [RBAC design](#7-rbac-design)
8. [Domain data model](#8-domain-data-model)
9. [The module contract](#9-the-module-contract)
10. [Money handling](#10-money-handling)
11. [Approval engine](#11-approval-engine)
12. [Integration adapter layer](#12-integration-adapter-layer)
13. [Jobs and the event bus](#13-jobs-and-the-event-bus)
14. [Authentication and security](#14-authentication-and-security)
15. [Audit and compliance](#15-audit-and-compliance)
16. [API conventions](#16-api-conventions)
17. [Web frontend architecture](#17-web-frontend-architecture)
18. [Mobile architecture (Flutter)](#18-mobile-architecture-flutter)
19. [Observability, configuration, deployment](#19-observability-configuration-deployment)
20. [Testing strategy](#20-testing-strategy)
21. [Migration plan from the current codebase](#21-migration-plan-from-the-current-codebase)
22. [Architecture Decision Record index](#22-architecture-decision-record-index)

---

## 1. Architectural principles

1. **Enforcement lives in one place.** Any security or scoping rule that a developer *can*
   forget *will* be forgotten. The current codebase proves it: `req.rbacScope` is computed
   on every request and read by zero controllers. Scoping is therefore applied by a
   repository layer that a controller cannot bypass, not by convention.
2. **Modular monolith, service-shaped.** One deployable process, but domain modules own
   their models, services, and routes and talk to each other only through published
   interfaces and events. When a module needs to become a service, the seam already exists.
3. **The database is not the validator.** Every write is validated by an explicit zod schema
   at the edge. Mongoose schemas are a storage contract, not an input contract — strict mode
   silently discarding an unknown field is exactly how the fee-concession bug shipped.
4. **Money and identity get transactions.** Anything touching payments, payroll, enrolment,
   or certificates runs inside a MongoDB transaction with an idempotency key.
5. **Every mutation is auditable, with before and after.** An audit row that records only
   "someone edited fees" is not an audit trail.
6. **The API contract is generated, never hand-written.** Drift between `openapi.yaml` and
   reality is a defect class we design out.
7. **Configuration over code for tenant variation.** Institution type, grading scheme,
   labels, fee shapes, approval thresholds and enabled modules are data, not branches.

---

## 2. System context

```
                        ┌──────────────────────────────────────────┐
                        │             CLIENTS                       │
                        │  Web (React SPA)   Flutter apps           │
                        │  · staff & admin   · Parent · Student     │
                        │  · public admission· Teacher · Driver     │
                        └───────────────┬──────────────────────────┘
                                        │ HTTPS  /api/v1
                        ┌───────────────▼──────────────────────────┐
                        │  EDGE: TLS · CDN (static) · rate limit    │
                        └───────────────┬──────────────────────────┘
                                        │
   ┌────────────────────────────────────▼─────────────────────────────────────┐
   │                    SCHOOL-ERP API (single Node.js process)                │
   │                                                                           │
   │  HTTP layer      requestId · helmet · cors · morgan · rate limit          │
   │  Auth layer      JWT verify → req.principal (user + roles + tenant)       │
   │  Platform layer  ScopeEngine · RBAC · Validation · Audit · Idempotency    │
   │  Domain modules  tenant · identity · academics · students · admissions ·  │
   │                  fees · attendance · exams · hr · library · transport ·   │
   │                  hostel · comms · inventory · reports · approvals …       │
   │  Infrastructure  repositories · unit-of-work · event bus · scheduler      │
   │  Adapters        payment · sms · whatsapp · email · push · storage        │
   └───────┬───────────────────────┬──────────────────────┬────────────────────┘
           │                       │                      │
     ┌─────▼─────┐          ┌──────▼──────┐        ┌──────▼───────────────────┐
     │ MongoDB   │          │ Object store│        │ External providers        │
     │ (replica  │          │ (S3-compat) │        │ Razorpay · MSG91 ·        │
     │  set, txn)│          │ docs, PDFs  │        │ WhatsApp · SMTP · FCM ·   │
     └───────────┘          └─────────────┘        │ Maps                      │
                                                   └───────────────────────────┘
```

**Why a replica set is mandatory:** MongoDB multi-document transactions require one. A
standalone `mongod` cannot run the fee-collection or enrolment flows correctly. Local
development uses a single-node replica set.

---

## 3. Runtime architecture

### 3.1 Layers

| Layer | Responsibility | May depend on |
|---|---|---|
| **HTTP** | Express wiring, middleware chain, error mapping | Platform |
| **Domain module** | Business rules for one bounded context | Platform, Infrastructure, other modules' *public interfaces only* |
| **Platform** | Scope engine, RBAC, validation, audit, idempotency, unit of work | Infrastructure |
| **Infrastructure** | Repositories, event bus, scheduler, cache | MongoDB driver |
| **Adapters** | External provider I/O behind an interface | — |

Dependencies point downward only. A domain module never imports another module's model or
controller — it calls the other module's exported service interface or subscribes to its
events. This is what makes a later service split mechanical rather than archaeological.

### 3.2 Why a modular monolith and not microservices

Per **D1**. Plan.docx §21 specifies 14 services on Kafka. That design is correct for the
scale it anticipates and wrong for the project's current position:

- The event catalogue (Plan.docx Appendix C) is implemented as an **in-process event bus**
  with the same event names and payloads. Publishers and subscribers are written exactly as
  they would be against Kafka.
- Cross-module reads go through interfaces that are already async and already
  failure-tolerant.
- Swapping the bus implementation for Kafka is a single infrastructure change; no publisher
  or subscriber code changes.

---

## 4. Target repository layout

`backend/src/modules/` currently contains only a `.gitkeep`. This is what it becomes.

```
backend/src/
  app.js                      Express assembly
  server.js                   bootstrap, graceful shutdown

  platform/                   ── cross-cutting, no business logic
    auth/                     JWT, refresh, MFA, lockout, sessions
    rbac/
      permissionResolver.js   role(s) + module + action → effective permission
      checkPermission.js      route middleware
      matrix/                 seed definitions for 12 system roles + 23 templates
    scope/
      scopeEngine.js          ← the central fix (see §6)
      scopeFilters.js         per-dimension filter builders
    validation/               zod → middleware, error mapping
    audit/                    before/after diff writer, retention
    idempotency/              Idempotency-Key store + replay
    uow/                      unit of work (transaction) helper
    errors/  response/        AppError hierarchy, envelope helpers

  infra/
    db/                       connection, transaction runner, indexes
    repository/               BaseRepository — scope is applied HERE
    events/                   in-process bus (Kafka-swappable)
    scheduler/                cron + retryable job runner
    cache/                    in-memory now, Redis-ready interface

  adapters/                   ── one folder per external capability
    payment/   { index.js, razorpay.js, cashfree.js, noop.js }
    sms/       { index.js, msg91.js, noop.js }
    whatsapp/  { index.js, cloudApi.js, wati.js, noop.js }
    email/     { index.js, smtp.js, noop.js }
    push/      { index.js, fcm.js, noop.js }
    storage/   { index.js, s3.js, local.js }

  modules/                    ── one folder per bounded context
    fees/
      fee.model.js  feeDemand.model.js  feePayment.model.js
      fee.schema.js           zod input schemas
      fee.service.js          business rules, transactions
      fee.controller.js       HTTP only — no business logic
      fee.routes.js           auth + permission + audit wiring
      fee.events.js           publishes INVOICE_CREATED, PAYMENT_RECEIVED
      fee.jobs.js             recurring demand generation, reminders
      index.js                the module's PUBLIC interface
      __tests__/
    students/  academics/  admissions/  attendance/  exams/  hr/ …

  scripts/                    seeds, one-off migrations
  migrations/                 ← NEW: ordered, idempotent, tracked
```

**Rule:** anything importable by another module is exported from that module's `index.js`.
Everything else is private. A lint rule enforces `no-restricted-imports` on deep paths.

---

## 5. Request lifecycle

```
1  requestId            attach X-Request-Id, start structured log context
2  helmet / cors        security headers; allow Authorization, X-Request-Id,
                        X-Tenant-Id, X-Branch-Id, Idempotency-Key
3  rateLimit            global; stricter bucket on /auth/*
4  json body parse      10 mb cap
5  authenticate         verify JWT → load user + roles → req.principal
                        reject if tokenVersion is stale (role change / password change)
6  resolveTenant        req.principal.tenantId, or X-Tenant-Id when impersonating
7  requireModule        403 MODULE_DISABLED if the tenant's plan excludes the module
8  checkPermission      403 FORBIDDEN if no role grants (module, action)
                        → attaches req.scope, the resolved effective scope
9  validate(schema)     400 VALIDATION_ERROR with per-field detail
10 idempotency          replay stored response for a seen Idempotency-Key
11 controller           parse → call service → send envelope
12 service              business rules; opens a transaction when it writes >1 document
13 repository           APPLIES req.scope to every query — not optional
14 audit                on success, write before/after diff
15 events               publish domain events after commit
16 errorHandler         AppError → envelope; unknown → 500 + logged with requestId
```

Steps 5–10 are declared once per route. Step 13 is the one that cannot be skipped, because
the repository requires a scope object to build a query at all.

---

## 6. Multi-tenancy and the Scope Engine

This section addresses **the single most serious defect in the current system** (feature
brainstorm §8.1): the three scope dimensions the entire RBAC document is built on are
computed and then ignored by every controller.

### 6.1 Isolation model

| Dimension | Field | Enforced by |
|---|---|---|
| Tenant (school / group) | `tenantId` on every business document | Scope engine, always, no exceptions |
| Branch | `branchId` on every branch-owned document | Scope engine per `branchScope` |
| Academic year | `academicYearId` on year-bound documents | Scope engine per `temporalScope` |
| Data slice | department / division / own | Scope engine per `dataScope` |
| Student slice | all / assigned / own children / own | Scope engine per `studentScope` |

### 6.2 The resolved scope object

`checkPermission` produces this and attaches it to the request. It is the *only* input the
repository needs.

```js
req.scope = {
  tenantId,                       // always present, never overridable by the client
  branchIds:  'ALL' | [ObjectId], // from branchScope + user's branch assignments
  academicYearIds: 'ALL' | [ObjectId],
  dataScope:  'group' | 'school' | 'department' | 'division' | 'own',
  departmentIds: [ObjectId],      // populated when dataScope === 'department'
  groupIds:      [ObjectId],      // AcademicGroups the user owns/teaches
  studentScope: 'all' | 'assigned_students' | 'own_children' | 'own',
  studentIds:   'ALL' | [ObjectId],
  userId,
}
```

### 6.3 The repository applies it

Every model is reached through a repository. There is no path to the driver that skips it.

```js
class BaseRepository {
  constructor(model, { scopeProfile }) { … }

  // scopeProfile declares HOW this collection maps to scope dimensions, e.g.
  //   { branchField: 'branchId', studentField: 'studentId',
  //     groupField: 'academicGroupId', ownerField: 'createdBy' }

  buildFilter(scope, extra = {}) {
    const f = { tenantId: scope.tenantId, deletedAt: null, ...extra };

    if (scope.branchIds !== 'ALL' && this.profile.branchField)
      f[this.profile.branchField] = { $in: scope.branchIds };

    if (scope.academicYearIds !== 'ALL' && this.profile.yearField)
      f[this.profile.yearField] = { $in: scope.academicYearIds };

    switch (scope.dataScope) {
      case 'division':   f[this.profile.groupField] = { $in: scope.groupIds }; break;
      case 'department': f[this.profile.deptField]  = { $in: scope.departmentIds }; break;
      case 'own':        f[this.profile.ownerField] = scope.userId; break;
      // 'school' and 'group' add nothing beyond branch
    }

    if (scope.studentIds !== 'ALL' && this.profile.studentField)
      f[this.profile.studentField] = { $in: scope.studentIds };

    return f;
  }

  find(scope, extra, opts)      { return this.model.find(this.buildFilter(scope, extra), …); }
  findOne(scope, extra)         { … }
  updateOne(scope, extra, patch){ … }   // scope also guards writes
  countDocuments(scope, extra)  { … }
}
```

**Three properties this buys:**

1. A controller *cannot* forget scoping, because it has no un-scoped API to call.
2. Scope applies to writes as well as reads — `updateOne` on a record outside your scope
   matches nothing and 404s, rather than succeeding. `create` stamps `tenantId`/`branchId`
   from scope and deletes them from the payload, so a body carrying another branch's id is
   ignored rather than honoured.
3. Adding a dimension later means changing one file.

**Two rules discovered while implementing this (both now enforced and tested):**

- **The portal student list is the boundary, not the branch.** When `studentScope` is
  `own_children` or `own`, the explicit student-id list is strictly narrower than any branch
  filter, so branch is *not* applied on top for collections carrying a student reference.
  Without this, a parent with children at two branches of the same trust silently loses one
  of them — the "one app for both children" case the functional specification names
  directly. Applying branch as well is not more secure, only more wrong.
- **`dataScope: 'own'` means different things to staff and to portal users.** For a teacher
  it resolves to an owner field or their taught groups; for a parent it is already expressed
  by the student dimension. Falling through to a group filter for a parent yields
  `groupIds: []` and therefore zero rows.

### 6.4 Escape hatches, deliberately loud

Some operations legitimately cross scope — the super-admin console, background jobs,
cross-branch reports for a Trustee. They use an explicit constructor:

```js
Scope.system('reason: nightly-fee-reminder-job')   // logged every time it is created
Scope.crossBranch(principal, branchIds)            // requires branchScope: 'all_branches'
```

Both are audited. `Scope.system()` is banned in `modules/**` by lint rule; only
`platform/**`, `infra/scheduler/**`, and `modules/*/[a-z]*.jobs.js` may call it.

### 6.5 Correcting today's role hard-coding

`applyBranchScope` currently decides branch access with
`['trustee'].includes(user.role)` — a role string that exists in no enum. Branch scope
becomes purely data-driven: it comes from the role's `branchScope` permission value plus
the user's `assignedBranchIds`, never from a hard-coded role name.

---

## 7. RBAC design

### 7.1 The permission tuple

Per the RBAC document: **(Role, Module, Action, Scope)**.

- **Actions:** `view` · `add` · `edit` · `delete` · `approve` · `export`
- **Scope dimensions:** `branchScope` · `dataScope` · `studentScope` · `temporalScope`

`temporalScope` (`current_ay` | `historical_read`) is specified in the RBAC doc but absent
from the current `Permission` model. It is added — it is what lets Alumni read their own
historical records without seeing current data.

### 7.2 System roles vs. custom roles

Per **D3**:

- **12 system roles** — `isSystem: true`, `tenantId: null`, seeded once, not deletable.
- **25 template roles** — seeded per tenant as ordinary editable `Role` documents, derived
  from the RBAC document's Section 3 matrix. Two further Govt/Aided templates (MDM
  Coordinator, UDISE+ Operator) are defined but not seeded by default.
- **Unlimited custom roles** — created in the UI by cloning any of the above.

This unifies the two competing models that exist in the code today: the `Permission`
collection (role-string × module, seeded globally) and the `Role` collection (per-tenant,
with a `permissions[]` array and a *different* action vocabulary — `create` instead of
`add`). **They are merged**: `Role` becomes the single source, carrying full permission
documents; `Permission` becomes the seed definition for system roles only. The action
vocabulary is unified on the RBAC document's six verbs.

### 7.3 Multi-role resolution

```js
resolveEffective(roles, module) {
  // additive actions: union — most permissive wins
  const additive = ['view','add','edit','approve','export'];
  // destructive on sensitive modules: intersection — most restrictive wins
  const SENSITIVE = ['fees','payroll','examinations','certificates'];

  for (const action of additive)
    effective[action] = roles.some(r => r.perm(module)[action]);

  effective.delete = SENSITIVE.includes(module)
    ? roles.every(r => r.perm(module).delete)   // ALL roles must allow
    : roles.some (r => r.perm(module).delete);

  // scope: widest wins per dimension
  effective.branchScope  = widest(roles.map(r => r.perm(module).branchScope));
  effective.dataScope    = widest(roles.map(r => r.perm(module).dataScope));
  effective.studentScope = widest(roles.map(r => r.perm(module).studentScope));
}
```

Both rules come verbatim from the RBAC document's multi-role resolution section.

### 7.4 Caching and invalidation

The current 5-minute TTL cache in `rbac.js` has no invalidation path — editing a role leaves
users on stale permissions for up to five minutes, which is unacceptable for a permission
*revocation*. Replacement:

- Cache key: `tenantId:roleId:module`, with a **version counter per tenant**.
- Any role or permission write bumps `tenant.rbacVersion`, invalidating that tenant's entries immediately.
- A role change also bumps the affected users' `tokenVersion`, forcing token refresh so the
  client's `permissionMap` cannot go stale either.

### 7.5 Frontend mirror

`auth.store.ts` keeps its shape (`permissionMap`, `enabledModules`, `can()`, `hasModule()`)
with two corrections:

- `hasModule` currently returns `true` when `enabledModules` is empty — it **fails open**.
  It becomes fail-closed, with the empty case treated as "no modules enabled".
- The `TENANT_MODULE_ALIASES` map in `moduleAliases.ts` exists to paper over the mismatch
  between the RBAC module vocabulary (`examinations`, `expenses`, `visitor_management`) and
  the plan module vocabulary (`exams`, `expense`, `visitors`). **The vocabularies are
  unified** on the RBAC names, a migration renames existing data, and the alias map is
  deleted.

---

## 8. Domain data model

### 8.1 Platform entities

```
Tenant ──1:N── Branch ──1:N── AcademicYear
  │                              │
  │                              └──1:N── Term ──1:N── HolidayCalendarEntry
  ├── institutionType: school | coaching | both      ← NEW (D8)
  ├── plan, enabledModules, featureOverrides
  ├── settings { locale, labels, gradingScheme, approvalThresholds }
  ├── integrations { payment, sms, whatsapp, email, maps }   (encrypted at rest)
  └── rbacVersion                                     ← NEW (§7.4)

User ──M:N── Role         (via UserRole, scoped + time-bounded)
  ├── tokenVersion                                    ← NEW (§14)
  ├── mfa { enabled, secret, backupCodes }            ← NEW
  ├── assignedBranchIds[]                             ← NEW (drives branchScope)
  ├── departmentIds[]                                 ← NEW (drives dataScope: department)
  └── linkedStudentIds[] / studentId                  (parent / student portal)
```

### 8.2 The academic core — redesigned

This replaces `Standard.divisions[]` (embedded subdocuments referenced by uppercase string)
and the denormalised `Student.standardId + divisionName` pair. Rationale is in feature
brainstorm §6.

```
AcademicYear ──1:N── Term

Standard            (schools)      Course           (coaching)
  order  0=Nursery … 14=Std 12       name, duration, subjects[]
  stage, streams[]                   feeModel
        │                                   │
        └──────────┬────────────────────────┘
                   ▼
             AcademicGroup                       ← NEW: the unified academic unit
               kind:      'section' | 'batch'
               parentRef: Standard | Course
               name:      "A" | "Mon/Wed 6PM"
               inchargeId: User (class teacher | faculty)
               capacity, strength
               academicYearId, branchId, tenantId
                   │
                   ▼
               Enrolment                          ← NEW: student ↔ group ↔ year
                 studentId, academicGroupId, academicYearId
                 rollNo, status: active|completed|transferred|withdrawn
                 joinedAt, leftAt
                 ── invariant: exactly ONE active per student (D9)
                 ── partial unique index on { studentId, status: 'active' }
```

**Everything year-bound points at `Enrolment` or `AcademicGroup`, never at
`standardId + divisionName`.** Attendance, timetable slots, homework, marks, fee demands and
transport allocations all take an `academicGroupId`.

**Why this matters, concretely:**

| Question | Today | After |
|---|---|---|
| "Who was in 8-A in 2025-26?" | Unanswerable — `Student.standardId` is overwritten on promotion | `Enrolment` query |
| "Rename Section A to Alpha" | Orphans every attendance/timetable/marks record keyed on the string `"A"` | Rename a document; ids unchanged |
| "Student takes Physics batch" | Impossible without a fake Standard per subject | `AcademicGroup { kind: 'batch' }` |
| "Student's fee history across years" | Joins on a mutable field | Joins on immutable `enrolmentId` |

**Upgrade path to many-to-many (D9):** drop the partial unique index on
`{ studentId, status: 'active' }`. No schema or code change is required in any consumer,
because every consumer already joins through `Enrolment`.

### 8.3 Student

Expanded from the current 74-line schema toward specification §5. Structured, not flat:

```
Student
  identity   { admissionNo, grNo, rollNo, udisePenNo, apaarId }
  personal   { name, photo, dob, gender, bloodGroup, religion, caste,
               category, motherTongue, aadhaarRef }   ← see §15.3 on Aadhaar
  addresses  [{ type: current|permanent, line1, line2, city, taluka,
                district, state, pinCode }]
  guardians  [{ relation, name, phone, email, occupation, qualification,
                income, photo, isPrimary, userId }]    ← userId links parent login
  health     → HealthRecord (separate collection, access-gated)
  documents  → StudentDocument[] (vault, per-type, verified flag)
  timeline   → StudentTimelineEvent[] (append-only lifecycle log)
  status     enquiry|admitted|active|inactive|transferred|alumni
  consent    { dpdpAcceptedAt, acceptedBy, purposes[] }   ← NEW, DPDP
```

Health, documents and timeline are separate collections rather than embedded arrays because
they grow unbounded and because they carry **different access rules** — the RBAC document
gives the School Nurse the health profile without the fee ledger, and the Counsellor
confidential notes that the Class Teacher must not see.

### 8.4 Fees

```
FeeHead        tuition, transport, lab, activity … (+ hsnSac, gstRate, isRefundable)
FeeStructure   per Standard|Course × AcademicYear × category
  components[] { feeHeadId, amount, gstRate }
  schedule     annual+installments | monthly | per-course | ad-hoc     ← D10
Concession     type: sibling|staff_ward|merit|sports|need|rte
               value, isPercentage, autoRule, approvalRequestId
FeeDemand      (the invoice) studentId, enrolmentId, period, dueDate
  components[] { feeHeadId, amount, concession, gst, paid, due }
  totalAmount, totalConcession, totalGst, totalPaid, totalDue, lateFee
  status: pending|partial|paid|overdue|waived|void
FeePayment     receiptNo (immutable, per-branch sequence), amount, method,
               gatewayRef, idempotencyKey, collectedBy, reversedBy
LedgerEntry    append-only double entry: account, debit, credit, refType, refId
```

`LedgerEntry` is new and is what makes "daily collection reconciles with the gateway
settlement to the rupee" (Plan.docx Appendix E) achievable. Corrections are reversal
entries; nothing is ever mutated.

### 8.5 Attendance

The current model embeds all student records in one document per class-day, with a unique
index on `{tenantId, standardId, divisionName, date, periodNo}`. That is a reasonable shape
and is kept, with three changes: keyed on `academicGroupId`, `source` recorded per record
(`manual|biometric|rfid|qr|face`), and a `corrections[]` sub-array capturing who changed
what, when, and with whose approval — because specification §9 makes attendance edits after
T+24h a Principal-override action.

### 8.6 Cross-cutting collections

| Collection | Purpose | Notes |
|---|---|---|
| `AuditLog` | before/after diff of every mutation | append-only; see §15 |
| `ApprovalRequest` | multi-level workflow state | see §11 |
| `IdempotencyRecord` | key → stored response | TTL 24h |
| `OutboxEvent` | domain events pending dispatch | transactional outbox, §13 |
| `NotificationTemplate` / `Notification` | template registry + delivery log | DLT ids, §12 |
| `Sequence` | atomic counters for receipt/TC/voucher numbers | §10.2 |
| `Migration` | applied migration ledger | §21 |

---

## 9. The module contract

Every module in `modules/` exposes exactly this shape. Nothing else is importable.

```js
// modules/fees/index.js
module.exports = {
  name: 'fees',
  routes,                       // Express router, mounted by routes/index.js
  jobs,                         // [{ name, schedule, handler }]
  events: { publishes: [...], subscribes: [...] },
  service: {                    // the PUBLIC interface other modules may call
    getOutstandingForStudent,   // used by certificates (no-dues check)
    hasClearedDues,             // used by admissions (transfer)
  },
  permissions: ['fees'],        // RBAC module keys this module owns
  models: { … },                // for migrations and seeds only
};
```

**Rules:**
- A module never imports another module's `*.model.js` or `*.controller.js`.
- Cross-module reads go through `service`; cross-module writes go through **events**.
- Example: issuing a TC does not call `FeeDemand` — it calls `fees.service.hasClearedDues(studentId)`.
- Example: creating a student does not call the SMS adapter — it publishes `STUDENT_ENROLLED`,
  and the communication module subscribes.

---

## 10. Money handling

Addresses feature brainstorm §8.2 and §8.3.

### 10.1 Transactions

Every operation touching more than one document runs in a unit of work:

```js
await uow.run(async (session) => {
  const payment = await paymentRepo.create(scope, dto, { session });
  await demandRepo.applyPayment(scope, dto.demandId, payment.amount, { session });
  await ledgerRepo.post(scope, entriesFor(payment), { session });
  outbox.publish('PAYMENT_RECEIVED', payload, { session });   // same transaction
});
```

The outbox write is inside the transaction; dispatch happens after commit. An event is
therefore never published for a transaction that rolled back, and never lost for one that
committed.

### 10.2 Atomic sequences

Receipt numbers, TC serials and voucher numbers use a dedicated counter, not read-then-write:

```js
// atomic, contention-safe, per tenant + branch + kind + financial year
const { seq } = await Sequence.findOneAndUpdate(
  { tenantId, branchId, kind: 'receipt', fy: '2026-27' },
  { $inc: { seq: 1 } },
  { new: true, upsert: true, session }
);
const receiptNo = `${prefix}/${fy}/${String(seq).padStart(6,'0')}`;
```

Backed by a unique index on `{ tenantId, branchId, receiptNo }` so a bug can never
double-issue silently.

### 10.3 Idempotency

`POST /fees/payments`, `POST /admissions/{id}/enrol`, `POST /payroll/runs/{id}/release`
and every gateway webhook require an `Idempotency-Key` header. The middleware stores
`(tenantId, key) → { status, body }` and replays the stored response on repeat. Gateway
webhooks additionally deduplicate on the provider transaction id and verify the HMAC
signature before any state change — as `docs/workflows/fee-collection-flow.md` already
specifies and no code implements.

### 10.4 Money representation

All amounts are stored as **integer paise**, never floating point. A shared `Money` helper
handles arithmetic, GST computation and ₹-lakh/crore formatting. Rounding is
half-up at the invoice line, and line totals are summed to the invoice total (never the
reverse) so a printed invoice always adds up.

### 10.5 GST

`FeeHead.gstRate` and `hsnSac` drive it. Tuition is exempt; transport, hostel, mess and
uniform are taxable per specification §10.5. GSTR-1/3B extract is a report over
`LedgerEntry`, not a separate computation.

---

## 11. Approval engine

Replaces the single-step, two-resource-type stub described in feature brainstorm §8.10.

### 11.1 Model

```
ApprovalWorkflow      (configuration, per tenant, seeded with 9 defaults)
  key: 'fee_concession' | 'staff_leave' | 'payroll_release' | 'mark_correction'
     | 'certificate_issue' | 'expense' | 'inventory_request' | 'branch_transfer'
     | 'admission'
  steps[] {
    order, name,
    approverRule: { type: 'role'|'reporting_officer'|'module_permission',
                    value: 'principal' | … },
    condition:    { field: 'amount', op: 'gt', value: 2500000 },  // paise
    slaHours,
    makerCheckerSeparation: true
  }

ApprovalRequest       (an instance)
  workflowKey, resourceType, resourceId, payload, currentStep
  status: pending|approved|rejected|cancelled|expired
  history[] { step, actorId, action, remarks, at }
```

### 11.2 Behaviour

- **Threshold escalation** — RBAC Appendix B thresholds (fee waiver 20% / 40%, expense
  ₹25k / ₹1L, inventory PO ₹10k / ₹50k) are `condition` rows, editable per tenant in
  Settings → Approval Thresholds, exactly as the RBAC document specifies.
- **Maker ≠ checker** — enforced by the engine, not by a controller. The payroll workflow
  refuses an approval by the user who prepared the run.
- **Approver resolution** — from RBAC (`who has approve on this module at this scope`) or
  from the reporting line, never from a hardcoded array.
- **SLA and escalation** — a scheduled job escalates or reminds past `slaHours`.
- **Side effects on approval** — published as an event
  (`APPROVAL_GRANTED{workflowKey, resourceId}`); the owning module subscribes and applies
  the change. The approvals module never writes another module's data.

---

## 12. Integration adapter layer

Per **D4**. Nothing in `modules/` ever imports a provider SDK.

### 12.1 Shape

```js
// adapters/sms/index.js
const drivers = { msg91, twilio, noop };

module.exports.forTenant = async (tenantId) => {
  const cfg = await tenantConfig.integrations(tenantId, 'sms');
  return drivers[cfg.provider ?? 'noop'](cfg);
};

// every driver implements the same interface:
interface SmsDriver {
  send({ to, templateId, params, dltTemplateId }): Promise<{ id, status }>;
  status(id): Promise<DeliveryStatus>;
}
```

### 12.2 Capabilities and drivers

| Capability | Drivers (v1) | Notes |
|---|---|---|
| `payment` | `razorpay`, `noop` | Order creation, webhook HMAC verify, refund, settlement reconciliation. Cashfree/PayU are additional drivers. |
| `sms` | `msg91`, `noop` | Carries the DLT template id; a send without one is rejected at the adapter, not by the carrier. |
| `whatsapp` | `cloudApi`, `noop` | Approved-template-only sends; inbound webhook routes replies to parent-teacher chat. |
| `email` | `smtp`, `noop` | School-branded, attachment support for report cards and receipts. |
| `push` | `fcm`, `noop` | Device token registry, per-user topic subscriptions. |
| `storage` | `s3`, `local` | Signed URLs; documents never served from the app process. |

### 12.3 Configuration and safety

- Credentials live in `Tenant.integrations`, **encrypted at rest** with a KMS-managed key
  (today they are plaintext).
- `noop` is the default for every capability, so a fresh development database runs the whole
  system with zero credentials, logging what *would* have been sent.
- Sandbox credentials are used in `staging`; a startup check refuses to boot `production`
  with any driver still set to `noop` for an enabled module.
- Every send is written to `Notification` with provider id, cost and delivery status —
  making per-tenant SMS credit accounting a query rather than a guess.

---

## 13. Jobs and the event bus

### 13.1 Event bus

Names and payloads come from Plan.docx Appendix C, unchanged, so the Kafka swap is a
drop-in. Delivery uses the **transactional outbox** (§10.1): events are written in the same
transaction as the state change and dispatched by a poller after commit.

| Event | Publisher | Subscribers |
|---|---|---|
| `STUDENT_ENROLLED` | admissions | fees (raise admission demand) · communication (welcome kit) · academics (roster) |
| `ATTENDANCE_ABSENT` | attendance | communication (parent SMS within 30 min) |
| `ATTENDANCE_LONG_ABSENCE` | attendance | communication (alert class teacher + principal) |
| `INVOICE_CREATED` | fees | communication (payment link) |
| `PAYMENT_RECEIVED` | fees | communication (receipt) · reports |
| `RESULT_PUBLISHED` | exams | communication (report card to parents) |
| `APPROVAL_GRANTED` | approvals | the owning module |
| `BOOK_OVERDUE` | library | communication |
| `BUS_NEAR_STOP` / `EMERGENCY_RAISED` | transport | communication |
| `ROLE_CHANGED` | identity | auth (bump `tokenVersion`) · rbac (invalidate cache) |

### 13.2 Scheduler

The system currently has no cron and no queue, which is why every notification in every flow
document is unimplemented. The scheduler is a tenant-aware, retryable, idempotent job runner:

| Job | Cadence | Module |
|---|---|---|
| Monthly/recurring fee demand generation | daily 00:30 IST | fees |
| Fee reminders D-7 / due / D+3 / D+7 | daily 09:00 IST | fees |
| Late-fee accrual | daily 00:45 IST | fees |
| Absence notification sweep | school-start + 30 min, per tenant timezone | attendance |
| Long-absence detection (3 / 7 / 15 days) | daily | attendance |
| Library overdue reminders | daily | library |
| Document expiry alerts (insurance, PUC, fitness, police verification) | daily | transport, hr |
| Approval SLA escalation | hourly | approvals |
| Scheduled report delivery | per user config | reports |
| Outbox dispatch | every 5 s | infra |
| Audit retention sweep | nightly | platform |

Jobs run with `Scope.system()` and are logged with a reason. Every job is idempotent and
re-runnable — quiet hours (21:00–07:00) and the 5-message daily throttle from Plan.docx §19
are enforced in the communication module, not per job.

---

## 14. Authentication and security

Closes feature brainstorm §8.8.

### 14.1 Tokens

| | Current | Target |
|---|---|---|
| Access token | 7 days, HS256 | **15 min**, RS256, rotated keys |
| Refresh token | none | 30 days, rotating, hashed at rest, per-device |
| Revocation | none | `tokenVersion` on User; bumped on password change, role change, or admin revoke |
| Session visibility | none | `/auth/sessions` list + revoke (wireframe WF-0005) |

The current `authenticate` middleware re-reads the user from the database on every request
to keep `role` fresh — a per-request query that exists only because there is no refresh
mechanism. With short-lived tokens plus `tokenVersion`, that read is replaced by a cached
version check.

### 14.2 MFA

Per RBAC §6.5, tiered:

| Tier | Roles | Method |
|---|---|---|
| Mandatory always | Super Admin, Trustee, Finance Controller, Compliance Officer | TOTP |
| Mandatory (school ops) | School Admin, Principal, Branch Admin, Accountant, HR Manager, IT Admin | TOTP or SMS OTP |
| Step-up on action | Mark unlock, payroll release, bulk PII export, Aadhaar unmask, role assignment | In-app OTP at the moment of the action |
| Device-bound | Driver | App PIN + device fingerprint |
| Standard | Teacher, Receptionist, Parent, Student | Password (+ optional OTP) |

Parents may log in with **phone OTP only**, per Plan.docx §7 — password friction is the main
cause of parent-app abandonment.

### 14.3 Other controls

- Password policy ≥ 8 chars with complexity; 5 failed attempts → 15-minute lockout; attempts logged.
- Login responses never disclose whether an email exists.
- `/auth/*` gets its own rate-limit bucket, far stricter than the global 500/15 min.
- Secrets from environment or a vault; the repository contains no credentials.
- File uploads: type allow-list, size cap, virus scan hook, stored in object storage with
  signed URLs — never served from the app process.
- Aadhaar handling: §15.3.

---

## 15. Audit and compliance

### 15.1 Audit log

The current implementation wraps `res.json` and records module, action and resource id. It
records **no before/after values**, which the RBAC document requires for financial and
academic changes. Target:

```
AuditLog  (append-only; no update or delete path exists in code)
  tenantId, branchId, actor { userId, email, role, name }
  module, action, resourceType, resourceId
  before, after, diff                     ← NEW
  reason                                  ← NEW (required for critical actions)
  requestId, ip, userAgent, at
  severity: info | warning | critical
  retainUntil                             ← NEW, from the policy below
```

Retention per RBAC §6.3: financial 7 years · academic 3 years · PII access 3 years ·
certificates permanent · role changes 7 years · authentication 1 year · communication 1 year
· POSH permanent. A nightly sweep enforces it. Export is restricted to the Compliance
Officer and **the export itself is audited**.

### 15.2 Critical actions

RBAC §6.1 lists twelve actions requiring MFA re-authentication (role assignment, payroll
release, fee-structure modification, waiver > 25%, bulk PII export, mark unlock, TC
issuance, audit-log access, permanent student delete, tenant provisioning, POSH access,
Aadhaar unmask). Each is declared on the route as
`critical({ reason: true, stepUpMfa: true })` and writes a `critical` audit row.

### 15.3 DPDP Act 2023

| Requirement | Implementation |
|---|---|
| Parent consent for a child's data | `Student.consent` captured at admission, versioned, withdrawable |
| Data minimisation | Field-level RBAC — the Nurse sees health, not fees; the Counsellor's notes are invisible to the Class Teacher |
| Right to access | Per-student data export, parent-initiated |
| Right to erasure | Soft delete → 30-day hold → hard delete job, Super Admin only, two-person confirmation |
| Aadhaar | **Never stored in plaintext.** Store a salted hash plus the last four digits. Display masked (`XXXX-XXXX-1234`). Unmask is a Compliance-Officer-only, step-up-MFA, per-view-audited action. The current `aadhaarMasked` field holds only four digits, which is acceptable; the design forbids ever adding a full-number field. |
| Data residency | Indian region only |

### 15.4 Other regimes

**RTE** — quota tracking, exemption, state report (v1, private schools included).
**POSH** — ICC-member-only access, anonymous reporting, 90-day clock; a separate collection
with its own access rule, invisible to `discipline` module permissions.
**TRAI/DLT** — template registry with DLT ids; the SMS adapter rejects an un-registered
template.
**GST** — HSN/SAC per fee head, GSTR-1/3B extract.

---

## 16. API conventions

Unchanged from `CLAUDE.md` where it already matches the code, tightened where it does not.

- **Base path** `/api/v1`. Versioned; breaking changes go to `/api/v2`.
- **Headers** `Authorization: Bearer` · `X-Request-Id` · `X-Tenant-Id` (impersonation only)
  · `X-Branch-Id` (branch selection within an all-branches scope) · `Idempotency-Key` (writes
  that move money or create people). `X-Branch-Id` must be added to the CORS allow-list —
  it is documented today but not permitted by `app.js`.
- **Success** `{ success: true, data, message?, meta? }` via `sendSuccess`.
- **Error** `{ success: false, error: { code, message, details } }` via the error handler.
- **Codes** — the full set from Plan.docx Appendix B is adopted, including the two the code
  lacks: `MODULE_DISABLED` (403) and `BUSINESS_RULE` (422).

| HTTP | Code | Meaning |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Body/params failed a zod schema |
| 401 | `UNAUTHENTICATED` | Missing, invalid or stale token |
| 403 | `FORBIDDEN` | Authenticated but lacks the permission |
| 403 | `MODULE_DISABLED` | Tenant's plan excludes the module |
| 404 | `NOT_FOUND` | Absent, or hidden by scope |
| 409 | `CONFLICT` | Duplicate or state conflict |
| 422 | `BUSINESS_RULE` | Rule violation (section full, marks exceed max, dues pending) |
| 429 | `RATE_LIMITED` | Throttled |
| 500 | `INTERNAL` | Unhandled; correlated by `requestId` |

- **Pagination** — every list endpoint, via `parsePagination`/`buildPaginationMeta`. No
  unbounded list ships (`fee.controller#defaulters` currently returns every row).
- **`openapi.yaml` is generated** from route + zod definitions in CI. A mismatch fails the build.

---

## 17. Web frontend architecture

The React app remains the **staff and admin surface** plus the public admission form. Parents
and students get the Flutter app; the web portal for them remains as a fallback.

```
frontend/src/
  app/          router, providers, error boundary
  modules/<m>/  pages, components, hooks, service, types   ← mirrors backend modules
  components/   ui/ (design system), auth/, layout/, data/ (Table, Filters, BulkBar,
                Import/Export wizards — wireframe WF-0285…WF-0304)
  stores/       auth.store, ui.store
  lib/          api client, query client, money, date, i18n
  config/       portalNav, moduleRegistry
```

**Corrections to the current implementation:**

| Issue | Fix |
|---|---|
| Only 7 of ~40 routes are guarded by `<ModuleRoute>` | A route registry declares `module` + `action` per route; the router applies the guard automatically. Unguarded routes become impossible. |
| `hasModule` fails open on empty `enabledModules` | Fail closed. |
| `DashboardPage` calls `useQuery` after conditional returns | Role dispatch moves into the router; each role dashboard is its own lazy route. |
| 12 of the 17 role dashboards are static link tiles with no data | Each gets a `GET /dashboard/:role` endpoint. Only `principal` is backed by real aggregates today; `studentDashboard` returns `"coming soon"`. |
| Pages import `lib/api` directly | Enforced by lint: pages import module services only. |
| No shared state components | The six system states (loading / empty / filtered-empty / error / 403 / module-disabled) become shared components, per wireframes WF-0275…WF-0281. |
| `services/index.ts` is one 156-line file for all domains | Split per module, colocated. |

**i18n** — `react-i18next` with English, Hindi and Gujarati in v1; the eight remaining
languages from specification §34 are additive resource bundles.

---

## 18. Mobile architecture (Flutter)

Per **D7**, a separate Flutter repository consuming the same `/api/v1`.

```
mobile/
  lib/
    core/       api client (dio + interceptors), auth, secure storage,
                offline queue, push, i18n, theme
    features/   parent/  student/  teacher/  driver/  admin/
    shared/     widgets, models (generated from the OpenAPI spec)
```

| App | Wireframes | Distinguishing requirement |
|---|---|---|
| **Parent** | WF-0232…0245 | Multi-child switcher, fee payment in ≤2 taps, live bus tracking, chat |
| **Teacher** | WF-0246…0254 | 40-student attendance in <30 s, **offline-first** with sync on reconnect |
| **Student** | WF-0255…0263 | Study material, quiz attempts, results |
| **Driver** | WF-0264…0269 | Background GPS, boarding scan, always-visible SOS, large driving-safe controls, driver's regional language |
| **Admin** | WF-0270…0274 | Approvals queue, quick reports |

**Shared concerns:** phone-OTP login for parent/student; FCM push; offline queue for
attendance and homework; forced upgrade when below the minimum supported API contract
version; models generated from the OpenAPI spec so the API and app cannot silently diverge.

Build order starts after backend Phase 7 (Attendance): **Parent → Teacher → Student → Driver → Admin**.

---

## 19. Observability, configuration, deployment

**Logging** — structured JSON via winston, every line carrying `requestId`, `tenantId`,
`userId`, `module`. No PII in logs.

**Metrics** — request rate, error rate, p95 latency per route; job success/failure and lag;
adapter call counts, cost and failure rate per provider per tenant.

**Health** — `/health` (liveness) and `/health/ready` (Mongo, object storage, adapters).
`/health` is already excluded from HTTP logging.

**Configuration** — a single validated config module. The process refuses to start if a
required variable is missing, rather than failing at first use. `JWT_SECRET` has no default.

**Environments** — `dev` (local Mongo replica set, `noop` adapters) · `staging` (sandbox
credentials, sample tenants) · `production` (Indian region, live credentials from a vault).

**Deployment** — containerised, single region, rolling deploy with health gating. Nightly
Mongo backups with a periodic restore drill; targets from Plan.docx Appendix E (RPO 15 min,
RTO 1 h, 99.9% monthly availability).

**Migrations** — the project has none today; the schema evolves by editing Mongoose files
and re-running seeds, which cannot be done safely against a live tenant. `migrations/` gains
ordered, idempotent, tracked scripts with a `Migration` ledger, run on deploy before the app
accepts traffic.

---

## 20. Testing strategy

There is no test suite at all today. That is the reason defects like the fee-concession
`NaN` reached a wired-up UI.

| Level | Tool | Coverage target |
|---|---|---|
| Unit | Vitest | Business rules: grading, GST, late fee, payroll deductions, scope filter construction, multi-role resolution |
| Integration | Vitest + supertest + `mongodb-memory-server` (replica set) | Every route: happy path, each RBAC boundary, each documented edge case |
| **RBAC matrix** | Generated | For every (role × module × action), assert allowed/denied against the seed matrix. Generated from the same source as the seed, so the matrix cannot drift from the tests. |
| **Scope** | Generated | Two tenants × two branches × two divisions seeded; assert every restricted role sees only its slice on every list endpoint. |
| Contract | OpenAPI diff | CI fails if the generated spec differs from the committed one |
| E2E | Playwright | Golden journeys per role (specification Appendix F) |
| Load | k6 | Plan.docx Appendix E: 5,000 concurrent per tenant, p95 <400 ms read / <800 ms write |

The RBAC and scope suites are the highest-value tests in the project: they are generated,
so they cost little to maintain, and they cover precisely the class of defect that is
currently systemic.

---

## 21. Migration plan from the current codebase

Nothing here is a rewrite. Each step is independently shippable.

> **Progress at 2026-08-15.** Steps 0–3 and 5–7 are done; step 4 (the academic-core data
> migration) is written and tested but **not yet run against a live database**; step 8 is
> in progress — 7 of 21 modules ported.
>
> The two layers coexist exactly as described below: new modules are mounted **before** the
> legacy routers in `routes/index.js`, so their routes win and anything they do not define
> falls through. Ported so far: **identity, academics, fees, approvals, exams, attendance,
> communication.**
>
> Two migrations exist and are idempotent:
> `001-user-role-bindings` (legacy role strings → `UserRole` bindings, closing the
> `school_owner` hole) and `002-academic-groups-and-enrolments` (additive: creates
> `AcademicGroup` and `Enrolment`, backfills `academicGroupId`, removes nothing).
> Run with `npm run migrate`; inspect with `npm run migrate:status`.

### Step 0 — unblock the repository
`git add` the two files unmerged in the index; add the ESLint rules that would have caught
the hooks violation and the deep-import problem.

### Step 1 — platform layer, alongside the existing code
Add `platform/` and `infra/` without touching a controller. New code only.

### Step 2 — repository + scope engine, one module at a time
Convert modules to `BaseRepository` in delivery order. A converted module gets its scope
tests immediately. Un-converted modules keep working unchanged — the two coexist.

### Step 3 — validation, one route at a time
Add a zod schema per route. Ship incrementally; a route without a schema logs a warning in
non-production so remaining gaps stay visible.

### Step 4 — the academic core migration *(the only data migration with real risk)*
1. Create `AcademicGroup` documents from every `Standard.divisions[]` entry.
2. Create `Enrolment` documents from each active `Student`'s current
   `standardId + divisionName + academicYearId`.
3. Backfill `academicGroupId` on Attendance, Timetable, Homework, MarksEntry, FeeDemand.
4. Dual-write for one release: new code writes both `academicGroupId` and the legacy pair.
5. Cut reads over to `academicGroupId`.
6. Drop the legacy fields in a later release.

Reversible at every step; steps 1–3 are additive and touch no existing field.

### Step 5 — RBAC unification
Merge `Permission` and `Role` (§7.2), unify the action vocabulary on the RBAC document's six
verbs, unify the module vocabulary, migrate existing role documents, delete
`moduleAliases.ts`.

### Step 6 — auth v2
Refresh tokens and `tokenVersion` first (they are backward compatible), then MFA, then
lockout and session management.

### Step 7 — integrations and jobs
Adapters with `noop` drivers, then the scheduler, then real drivers on sandbox credentials.

### Step 8 — module-by-module rebuild
Per the delivery plan in feature brainstorm §10, each module to its Definition of Done.

---

## 22. Architecture Decision Record index

| ADR | Decision | Status | Rationale |
|---|---|---|---|
| **ADR-01** | MongoDB modular monolith, not microservices | Accepted | Existing codebase is Mongo; a 14-service rewrite stalls before shipping features. Seams preserved for a later split. |
| **ADR-02** | Scope enforced in the repository, not in controllers | Accepted | 36 controllers currently ignore `req.rbacScope`. Convention has already failed once here. |
| **ADR-03** | `AcademicGroup` + `Enrolment` replace `Standard.divisions[]` + denormalised student fields | Accepted | Enables coaching batches, preserves class history across promotion, gives divisions stable identity. |
| **ADR-04** | One **active** enrolment per student, not many-to-many | Accepted | Matches the stated requirement; upgrade path is dropping one index. |
| **ADR-05** | 12 system roles + template roles, `Role` and `Permission` merged | Accepted | Reconciles two role systems already in the code and two in the specs. |
| **ADR-06** | zod validation at the edge; Mongoose is storage only | Accepted | Strict-mode silent field drops produced the fee-concession defect. |
| **ADR-07** | Integer paise, never floats | Accepted | Reconciliation to the rupee is an acceptance criterion. |
| **ADR-08** | Transactional outbox for domain events | Accepted | No lost or phantom events; Kafka-swappable. |
| **ADR-09** | Provider-agnostic adapters with a `noop` default | Accepted | Development needs no credentials; production adds providers without code changes. |
| **ADR-10** | `openapi.yaml` generated, not hand-written | Accepted | The committed file already documents ~12 non-existent endpoints. |
| **ADR-11** | In-process event bus now, Kafka later | Accepted | Same names and payloads as Plan.docx Appendix C; swap is infrastructure-only. |
| **ADR-12** | Flutter for mobile | Accepted | Plan.docx Appendix D; background GPS and offline attendance need native. |
| **ADR-13** | Aadhaar never stored in plaintext | Accepted | DPDP + UIDAI. Hash + last four only; unmask is a Compliance-Officer, MFA-gated, audited action. |
| **ADR-14** | Approval side effects applied via events, not direct writes | Accepted | Keeps the approvals module from writing every other module's data. |

---

## Approval

| Role | Name | Date | Signature |
|---|---|---|---|
| Technical lead | | | |
| Product owner | | | |
