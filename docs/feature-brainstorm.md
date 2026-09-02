# School ERP — Feature Brainstorm & Scope Definition

**Status:** Draft for approval
**Date:** 2026-08-15
**Companion documents:** [`docs/architecture/system-architecture.md`](architecture/system-architecture.md) · [`docs/verification/e2e-verification.md`](verification/e2e-verification.md)

This document defines **what we are building and in what order**. It reconciles the three
existing specification documents (which disagree with each other), records the product
decisions that resolve those disagreements, inventories every module against what is
actually implemented today, and lays out the delivery plan.

It is the answer to *"what should this product do, for whom, and what do we build next"*.
The **how** lives in the architecture document.

---

## Table of Contents

1. [Why this document exists](#1-why-this-document-exists)
2. [Product definition](#2-product-definition)
3. [Locked decisions](#3-locked-decisions)
4. [Spec reconciliation — which document wins](#4-spec-reconciliation--which-document-wins)
5. [The role model — 12 system roles + templates](#5-the-role-model--12-system-roles--templates)
6. [The school/coaching duality](#6-the-schoolcoaching-duality)
7. [Module inventory — spec vs. built vs. gap](#7-module-inventory--spec-vs-built-vs-gap)
8. [Confirmed defects in the current build](#8-confirmed-defects-in-the-current-build)
9. [Definition of Done for a module](#9-definition-of-done-for-a-module)
10. [Delivery plan](#10-delivery-plan)
11. [Explicitly out of scope for v1](#11-explicitly-out-of-scope-for-v1)
12. [Open questions](#12-open-questions)

---

## 1. Why this document exists

The repository contains four sources of truth that contradict each other, plus a codebase
that agrees with none of them completely:

| Source | Says | Age |
|---|---|---|
| `Enterprise_School_ERP Plan.docx` | PostgreSQL + Kafka microservices, 12 roles, `module:action:scope` permissions, RS256 JWT + refresh, MFA | v1.0, 2026-05-29 |
| `Enterprise_School_ERP_Indian_Specification_v2.md` | 38 functional sections, 18 roles, Indian compliance detail | v2.0, June 2026 |
| `RBAC_Permission_Architecture_Plan.md` | 34 roles in 6 tiers, 4-tuple permissions with 3 scope dimensions, 9 approval workflows | June 2026 |
| `Enterprise_School_ERP Wireframe.docx` | 304 screens across 20 areas | v1.0, June 2026 |
| **The code** | MongoDB + Express monolith, 19 role strings, 42 models, 73 pages | current |

Building against contradictory specs is how you get the current situation: broad surface
area, shallow depth, and features that are wired end-to-end in the UI but fail at runtime.
This document freezes one answer per contradiction so that every subsequent decision has a
reference.

> **A note on the root-folder assets.** `WhatsApp Image 2026-06-15 at 7.23.12 PM.jpeg` is a
> business-networking event flyer unrelated to this product. It is not an input to the
> design and should be moved out of the repository root.

---

## 2. Product definition

### 2.1 What it is

A multi-tenant SaaS platform that runs the complete operations of an Indian educational
institution — from the first admission enquiry to the final transfer certificate.

### 2.2 Who it serves

| Segment | In scope | Notes |
|---|---|---|
| **Private CBSE / ICSE schools** | ✅ v1 primary | The mainstream paying market. GST-aware fees, CBSE grading (A1–E), co-scholastic, transport, hostel. |
| **Private State Board schools** (GSEB, Maharashtra, TN, KA…) | ✅ v1 primary | Per-state grading rules, regional-language communication and report cards. GSEB is the nearest real market. |
| **Tuition / coaching classes** | ✅ v1 | Batch-based rather than class-based. See §6. |
| **Grades covered** | Pre-primary (Nursery / LKG / UKG) through Standard 12 | "Standard 0 to 12" — the `Standard.order` field already models Nursery=0. |
| IB / Cambridge | ⏸ v2 | Needs 1–7 and IGCSE grading engines. The grading engine will be pluggable so this is additive, not a rewrite. |
| Govt / Aided schools | ⏸ v2 | Needs Mid-Day Meal / PM POSHAN, UDISE+ export, state reimbursement. Deferred, but the RTE 25% workflow stays in v1 because **private unaided schools must also report RTE**. |

### 2.3 Core value proposition

1. **One login, one platform** — replaces spreadsheets, WhatsApp groups, and legacy desktop software.
2. **Role-aware** — 12 system roles plus unlimited custom roles, with real data-scope enforcement.
3. **Multi-branch native** — a trust running 5 branches gets consolidated dashboards with strict per-branch data isolation.
4. **Indian-first** — ₹ lakh/crore formatting, GST on taxable fee heads, DLT-compliant SMS, UPI-first collection, DPDP consent, RTE quota, regional languages.
5. **Mobile-first for the high-volume roles** — Parent, Student, Teacher and Driver get native Flutter apps.

### 2.4 Non-negotiable quality bar

The instruction driving this rebuild is: *"I don't want to make any mistake, all
functionality should work proper."* That translates to four hard rules:

- **No feature ships without its data-scope enforcement.** A UI that shows a button the API rejects is not shipped.
- **No money moves without a transaction and an idempotency key.**
- **No module is "done" until its verification checklist passes** (see the e2e verification document).
- **No documented endpoint that does not exist.** `openapi.yaml` becomes generated-from-code or is deleted.

---

## 3. Locked decisions

These were decided in the scoping session on 2026-08-15 and are binding until explicitly revisited.

| # | Decision | Choice | Consequence |
|---|---|---|---|
| **D1** | Architecture | **MongoDB modular monolith** | Keep and refactor the existing codebase. No rewrite. Plan.docx's microservices/PostgreSQL section becomes a future scale-out appendix; its NFRs and event catalogue are kept as targets. |
| **D2** | Delivery order | **Module by module, each completed fully** | A module is not started until the previous one passes its Definition of Done (§9). Slower to a complete-looking demo; nothing is ever half-built. |
| **D3** | Role model | **12 system roles + custom role templates** | Plan.docx's 12 canonical roles become system roles. The other 25 roles from the RBAC doc ship as pre-built, cloneable custom-role templates. Nothing that exists today is lost. See §5. |
| **D4** | Integrations | **Provider-agnostic adapters + sandbox** | One interface per channel (payment / SMS / WhatsApp / email / storage), one real driver wired to sandbox credentials, plus a no-op logging driver so development needs zero keys. |
| **D5** | Market | Private CBSE/ICSE + private State Board + tuition/coaching, Nursery→12 | RTE in v1. MDM/PM POSHAN, UDISE+ export, IB/Cambridge grading deferred to v2. |
| **D6** | Multi-branch | **Day one, enforced centrally** | Every query passes through a scope resolver. This is the single largest correctness fix in the project. |
| **D7** | Mobile | **Flutter**, per Plan.docx Appendix D | Separate Flutter codebase consuming the same REST API. Web app remains the staff/admin surface. |
| **D8** | Coaching support | **One product, `institutionType` switch** | `school` \| `coaching` \| `both`. Generic `AcademicGroup` renders as Class+Section or as Batch. |
| **D9** | Enrolment cardinality | **One active enrolment per student** | `Enrolment` is a first-class record (preserving year-over-year and batch-change history) with a single-active invariant. Documented upgrade path to many-to-many. |
| **D10** | Fee shapes | Annual+installments · per-batch · monthly recurring · ad-hoc | All four supported by one demand-generation engine. Monthly recurring requires the job scheduler. |
| **D11** | Current deliverable | **Documents first, then build** | ✅ Documents delivered and approved. Phase 0 implementation started 2026-08-15 — see §10.1. |

---

## 3.0 Build status — 2026-08-15

Phases 0, 2, 3, 6, 7, 8, 10 and the approvals engine are **built and tested**. The
remaining phases are not started; §10.2 tracks the whole plan.

| # | Phase | Status | Evidence |
|---|---|:--:|---|
| 0 | Platform foundation | ✅ | `platform/`, `infra/`, `adapters/` — §3.1 |
| 1 | Tenant & Onboarding | ◐ | `Tenant` model extended (`institutionType`, thresholds, `rbacVersion`); module not built |
| 2 | Identity & Auth | ✅ backend | `modules/identity` — refresh + rotation, reuse detection, MFA (TOTP), forgot/reset, lockout, sessions |
| 3 | Academic Structure | ✅ | `modules/academics` — `AcademicGroup`, `Enrolment`, `Course`, `Department`, migration 002 |
| 4 | Students | ◐ | Model rebuilt to spec §5 (+ documents vault, timeline, DPDP consent, Aadhaar blind index); module not built |
| 5 | Admissions | ✗ | not started |
| 6 | Fees & Accounting | ✅ | `modules/fees` — 4 fee shapes, concessions, GST, ledger, day book, reversal |
| 7 | Attendance | ✅ | `modules/attendance` — multi-source, dedup, edit window, absence + long-absence |
| 8 | Communication | ✅ | `modules/communication` — dispatch, templates, quiet hours, throttle, DLT |
| 9 | Timetable | ✗ | not started |
| 10 | Exams & Results | ✅ | `modules/exams` — grading engine, marks lock, correction workflow, publication gate |
| 11 | Approvals engine | ✅ | `modules/approvals` — 9 workflows, thresholds, maker-checker, SLA |
| 12–21 | LMS, Library, Transport, Hostel, Front Office, Inventory, Discipline/Health, Events/Alumni, Reports, Super Admin | ✗ | not started; legacy controllers still serve these routes |
| — | Flutter apps | ✗ | not started |

**Confirmed defects (§8): 9 of 13 fixed and regression-tested.**

| Defect | Status |
|---|---|
| A1 data scope not enforced | ✅ scope engine + repository, 19 tests |
| A2 branch isolation | ✅ same |
| A3 fee concession NaN | ✅ `FeeDemand.recalculate()`, 6 tests |
| A4 receipt race / no transaction | ✅ atomic sequence + unit of work, 50-way concurrency test |
| A5 `school_owner` locked out | ✅ role bindings + migration 001 |
| A6 no marks lock | ✅ `lockState` + correction workflow, 12 tests |
| A7 500 on invalid exam id | ✅ null check + test |
| A8 no notifications | ✅ adapters + dispatcher + subscribers, end-to-end test |
| A9 auth surface incomplete | ✅ `modules/identity`, 20 tests |
| A10 no validation | ✅ zod on every new route (legacy routes still unvalidated) |
| A11 approvals single-step | ✅ engine with 9 workflows, 14 tests |
| A12 frontend guards + hooks | ✅ route registry, `ModuleRoute`, `hasModule` fail-closed, `DashboardPage` rewritten |
| A13 git index unmerged | ✅ resolved |

**Additional defects found and fixed during the build** (none were in the original audit —
all were caught by a failing test):

1. `BaseRepository.buildFilter` **overwrote** a caller's `_id` criterion when a scope
   dimension used the same field, instead of intersecting. A read for one record could
   return a different one.
2. A parent with children at two branches lost one of them (branch narrowed on top of
   `own_children`).
3. `dataScope: 'own'` resolved to a group filter for portal users, returning zero rows.
4. Master data with no `branchId` (academic years, classes, subjects) was invisible to
   every branch — `branchOptional` added.
5. A **flat** concession was applied once per component, turning ₹2,000 into ₹3,000 on a
   two-component invoice.
6. A cheque-bounce charge was added once per allocation rather than once per demand.
7. The adapter registry treated a Mongoose schema *default* as configuration, so a fresh
   tenant was routed at a live SMS provider with no credentials and every message failed
   silently.

---

## 3.1 Phase 0 status

Phase 0 (platform foundation) is **complete and green**: 72 automated tests across 3 suites,
`npm run lint` clean (0 errors), every platform module loading.

| Phase 0 item | Status | Where |
|---|---|---|
| Scope resolver, enforced in the repository | ✅ | `platform/scope/*`, `infra/repository/BaseRepository.js` |
| RBAC v2 — 12 system roles, 25 templates, multi-role resolution, versioned cache | ✅ | `platform/rbac/*` |
| Validation layer (zod) with Indian primitives | ✅ | `platform/validation/validate.js` |
| Transactions (unit of work) + atomic sequences | ✅ | `platform/uow/`, `platform/sequence/` |
| Idempotency middleware + replay store | ✅ | `platform/idempotency/` |
| Audit v2 — before/after diff, redaction, append-only, retention | ✅ | `platform/audit/*`, `models/AuditLog.js` |
| Event bus + transactional outbox + scheduler | ✅ | `infra/events/*`, `infra/scheduler/*` |
| Integration adapters (6 capabilities, noop default) + credential encryption | ✅ | `adapters/*`, `platform/crypto/secrets.js` |
| Money helper — integer paise, GST, lossless allocation, ₹ formatting | ✅ | `shared/money.js` |
| Migration runner + first migration | ✅ | `migrations/` |
| Test harness (Vitest + in-memory replica set) | ✅ | `tests/` |
| Config validation, readiness probe, CORS/rate-limit fixes | ✅ | `config/env.js`, `platform/health/readiness.js` |
| Auth v2 — tokens, sessions, MFA, lockout | ◐ primitives built; routes land with the Identity module (Phase 2) | `platform/auth/*` |
| Defect fixes: A13 git index, A12 hooks, A11 route guards | ◐ A13 done; A11/A12 are frontend, land in Phase 1 | — |

**Two design rules were discovered by the tests during implementation** and are now documented
in architecture §6.3: the portal student list overrides branch scope (a parent with children at
two branches was losing one), and `dataScope: 'own'` resolves differently for staff and portal
users. Both were caught by a failing test rather than in review — which is the argument for the
generated scope suite.

---

## 4. Spec reconciliation — which document wins

| Topic | Winner | Losers and why |
|---|---|---|
| Runtime architecture | **The code** (MongoDB monolith), refactored per D1 | Plan.docx §3/§21/§23 describes a 14-service Kafka deployment. Retained as a scale-out appendix and as the source of the domain-event catalogue, which we implement as an **in-process event bus** now and can swap for Kafka later without changing publishers. |
| Non-functional targets | **Plan.docx Appendix E** | Nothing else specifies latency, availability, or accessibility targets. Adopt as-is. |
| Domain events | **Plan.docx Appendix C** | Good catalogue. Implemented in-process. |
| Functional behaviour, business rules, Indian context | **`Enterprise_School_ERP_Indian_Specification_v2.md`** | The most detailed and most India-specific. This is the product spec. |
| Permissions matrix, scope dimensions, approval workflows | **`RBAC_Permission_Architecture_Plan.md`** | Sections 3, 5, and 6 are the most rigorous treatment in the repo. Its 34 roles become permission *templates* (D3) rather than 34 system roles. |
| Role list | **Plan.docx §4** (12) for system roles, **RBAC doc §1** for templates | Reconciled by D3, not a conflict in practice — Plan.docx §5.2 itself marks VP, HoD, Exam Coordinator, Class Teacher and Cashier as custom roles. |
| Screen inventory | **`Enterprise_School_ERP Wireframe.docx`** | 304 screens is the completeness target. Not all are v1 (§10). |
| API contract | **Generated from code** | `docs/architecture/openapi.yaml` currently documents ~12 endpoints that do not exist (`/auth/refresh`, `/fees/payments/webhook/razorpay`, `/exams/{id}/marks/lock`, `/students/{id}/360`, `/students/{id}/tc`, `/fees/daybook`, `/communication/email`, `/communication/push`, `/hr/payroll/runs/{id}/approve`, `/tenants`) and names others differently from the implementation (`/attendance/students/bulk` vs. `/attendance/mark`, `/students/import` vs. `/students/bulk-import`). It becomes a build artefact, not a hand-maintained file. |
| Workflow diagrams | **Rewrite** | `docs/workflows/*.md` reference a `StudentEnrollment` model, a job queue, Razorpay HMAC verification, and saga compensation — none of which exist. They describe the target correctly; they will become accurate once the modules are built. Mark them `TARGET` until then. |

---

## 5. The role model — 12 system roles + templates

### 5.1 System roles (built in, cannot be deleted)

Per **D3**, these 12 are hard-coded, seeded for every tenant, and referenced by
`User.role`:

| # | Role | Tier | Primary surface |
|---|---|---|---|
| 1 | `super_admin` | Platform | Platform console: tenants, plans, billing, health. **No student PII by default.** |
| 2 | `school_admin` | Tenant | Setup wizard, users, roles, modules, branding, integrations. |
| 3 | `principal` | Branch | Full branch authority; approvals inbox is the primary CTA. |
| 4 | `teacher` | Branch | Today-view: periods, attendance, homework, marks. |
| 5 | `student` | Portal | Timetable, homework, study material, results, library. |
| 6 | `parent` | Portal | Child dashboard, fees, chat, bus tracking. Multi-child switcher. |
| 7 | `accountant` | Branch | Fees, payroll prep, expenses, GST, day book. |
| 8 | `hr_manager` | Branch | Staff records, leave, payroll structure, appraisals. |
| 9 | `librarian` | Branch | Catalogue, issue/return, fines, digital library. |
| 10 | `receptionist` | Branch | Visitors, gate pass, enquiry capture, OTP dispatch. |
| 11 | `driver` | Field | Route start/stop, boarding scan, SOS, fuel log. |
| 12 | `transport_manager` | Branch | Vehicles, routes, allocation, GPS, maintenance. |

> **Fixing the current holes.** Today `User.role` allows `school_owner`, which has **zero
> rows in the `Permission` collection and is absent from `Permission`'s own enum** — that
> user is locked out of every module with an empty sidebar. Separately,
> `rbac.js#applyBranchScope` special-cases the string `'trustee'`, which is not a valid
> role anywhere in the system. Both disappear under this model: `school_owner` becomes the
> **Trustee** template, and branch scope stops being decided by hard-coded role strings.

### 5.2 Custom role templates (pre-seeded, cloneable, editable, deletable)

Every role below ships as a `Role` document with a full permission set derived from the
RBAC doc's Section 3 matrix. A school enables the ones it needs and edits them freely.
This is how the RBAC doc's 34-role model is preserved without 34 hard-coded roles.

**25 templates ship enabled**; the two Govt/Aided ones are defined but seeded only with
`--govt-aided`.

| Group | Templates |
|---|---|
| **Group / Trust** | Trustee (School Owner) · Group Academic Director · Group Finance Controller · Compliance Officer |
| **Branch leadership** | Branch Admin · Vice Principal · Academic Supervisor |
| **Academic** | HoD · Exam Coordinator · **Class Teacher** *(scoped variant of Teacher)* · Lab Assistant |
| **Admissions** | Admission Head · Admission Officer · RTE Officer |
| **Finance** | **Cashier** *(collect-only variant of Accountant)* · Store Manager |
| **Operations** | Hostel Warden · Mess Manager · Event Coordinator · Reception Manager · IT Administrator |
| **Student support** | Counsellor · Discipline Coordinator · School Nurse / Health Officer |
| **External** | Alumni |
| **Deferred to v2 (Govt/Aided)** | MDM Coordinator · UDISE+ Data Operator |

### 5.3 Multi-role users

The RBAC doc requires it ("a single user can hold more than one role"), Plan.docx models it
(`user_roles` many-to-many), and the code does not implement it — `buildTokenPayload` emits
a single `role` string and no `roles` array, despite `CLAUDE.md` documenting one.

**Decision:** implement multi-role in the Identity module, with the RBAC doc's resolution rule:

- **Additive actions** (`view`/`add`/`edit`/`approve`/`export`) → **union**, most permissive wins.
- **Destructive actions** (`delete`) on sensitive modules (Fees, Payroll, Marks, Certificates) → **most restrictive wins**.
- **Scope** → widest branch scope, widest data scope, per module.
- **UI** → sidebar is the union of granted menus; dashboard is tabbed per role context.

### 5.4 Delegation and impersonation

Both are specified (Plan.docx §5.6) and neither exists. Both go in the Identity module:

- **Delegation** — a Principal grants a subset of their permissions to a Vice Principal for a fixed window, with automatic expiry and revocation.
- **Impersonation** — Super Admin "login as" for support, with an immutable audit entry and a persistent `IMPERSONATING` banner in the UI.

---

## 6. The school/coaching duality

Tuition and coaching classes are a v1 segment but appear in **none** of the specification
documents. They break the current academic core in a specific way:

| | School | Coaching |
|---|---|---|
| Academic unit | Standard → Division ("Class 8, Section A") | Batch ("JEE Physics — Mon/Wed 6 PM") |
| Ownership | One class teacher owns a division | One faculty member owns a batch |
| Progression | Annual promotion 8→9 | Course completion / re-enrolment |
| Fees | Annual structure, term installments | Per course/batch, monthly or 2–3 chunks, prorated from join date |
| Certificates | TC, Bonafide, Character | Completion certificate only; **no TC** |
| Reporting | Board, RTE, UDISE | None |

### 6.1 The resolution

A single `AcademicGroup` entity replaces the current `Standard.divisions[]` subdocument
array, and `Tenant.institutionType` decides how it is labelled and behaves:

```
Tenant.institutionType = 'school' | 'coaching' | 'both'

AcademicGroup {
  kind: 'section' | 'batch'
  parentId          // → Standard, for schools; → Course, for coaching
  name              // "A" | "Mon/Wed 6PM"
  inchargeId        // class teacher | faculty
  capacity, strength
}
```

Everything downstream — attendance, timetable, homework, marks, fees, communication —
targets an `AcademicGroup` id rather than the current `standardId + divisionName` string
pair. A tenant set to `both` runs day school and evening batches side by side.

### 6.2 Why this also fixes the school model

The current design has three problems that the redesign resolves as a side effect:

1. **Divisions have no stable identity.** They are embedded subdocuments referenced by an
   uppercase string (`divisionName`). Renaming Section A to Section Alpha orphans every
   attendance record, timetable slot, and marks entry that referenced it.
2. **Class history is lost on promotion.** `Student.standardId` is overwritten when a
   student is promoted from 8-A to 9-A. The question *"who was in 8-A during 2025-26?"* is
   unanswerable — which breaks year-over-year reporting, alumni records, and any
   board/RTE submission that needs a historical roster.
3. **`Enrolment` is already assumed to exist.** `docs/workflows/admission-flow.md` writes
   `API->>MongoDB: Create StudentEnrollment` — the workflow doc was written against a model
   that was never built.

The `Enrolment` record (student ↔ academic group ↔ academic year, with **one active at a
time** per D9) fixes all three.

---

## 7. Module inventory — spec vs. built vs. gap

**Legend for "Built":** 🟢 works · 🟡 partial / shallow · 🔴 stub or broken · ⚫ absent

| # | Module | Spec ref | Built | Principal gap |
|---|---|---|---|---|
| 0 | **Platform foundation** | Plan §5, §24 | 🟡 | Scope engine unused; no validation layer; no job queue; no event bus; no tests |
| 1 | Tenant & Onboarding | Spec §32, §35 | 🟡 | `institutionType` absent; branch model unused; onboarding wizard is the only transactional code in the repo |
| 2 | Identity & RBAC | RBAC doc all | 🟡 | No multi-role, no custom-role UI wiring, no delegation/impersonation, 2 role enums disagree |
| 3 | Auth & Security | Plan §7, §24 | 🔴 | No refresh token, MFA, forgot/reset password, lockout, or token revocation — all four are in `openapi.yaml` |
| 4 | Academic Structure | Spec §6, §7 | 🟡 | No `AcademicGroup`, no `Enrolment`, divisions are embedded strings, no term/holiday calendar, no houses |
| 5 | Students | Spec §5 | 🟡 | `Student.js` is 74 lines against an ~80-field spec: no documents vault, timeline, awards, address split, APAAR/PEN validation, ID-card templates |
| 6 | Admissions | Spec §4 | 🟡 | No application/offer/waitlist entities, no document verification, no merit list, no entrance test, no dedup, no capacity lock under concurrency |
| 7 | **Fees & Accounting** | Spec §10 | 🔴 | **Concession is broken (§8.2)**, receipt numbers race, no transactions, no idempotency, no gateway, no GST report, no day book, no ledger, no refunds, no late-fee engine |
| 8 | Attendance | Spec §9 | 🟡 | Manual only — no biometric/RFID/QR/face ingestion, no absence SMS, no long-absence alert, no staff attendance, no correction workflow |
| 9 | Timetable | Spec §8 | 🟡 | No auto-generation, no conflict detection, no substitution/proxy, no exam date sheet, no faculty diary |
| 10 | Exams & Results | Spec §11 | 🟡 | **No marks lock**, no max-marks validation, no grading-rule engine, no result approval gate, no report-card designer, no revaluation, no grace marks, no hall tickets/seating |
| 11 | Homework & Classwork | Spec §12 | 🟡 | No submissions, no rubric grading, no reminders, no syllabus linkage |
| 12 | Study Material / LMS | Spec §13 | 🔴 | Model exists, no file storage, no live classes, no quizzes, no progress tracking |
| 13 | Communication | Spec §14 | 🔴 | **No dispatch at all.** No SMS/WhatsApp/email/push driver, no templates, no DLT registry, no quiet hours, no throttle, no parent-teacher chat |
| 14 | HR & Payroll | Spec §19 | 🟡 | No salary structure engine, no PF/ESIC/PT/TDS, no Form 16, no bank NEFT file, no maker-checker, no appraisal, no recruitment |
| 15 | Library | Spec §18 | 🟡 | No barcode/QR, no reservations, no fine engine, no stock audit, no digital library |
| 16 | Transport | Spec §15 | 🔴 | 41-line controller. No GPS, no boarding scan, no live tracking, no document-expiry blocking, no driver app surface |
| 17 | Hostel & Meals | Spec §16, §17 | 🔴 | No roll call, no gate pass with parent OTP, no mess attendance, no dietary restrictions |
| 18 | Discipline | Spec §21 | 🔴 | 41-line controller. No merit/demerit points, no suspension workflow, no POSH/ICC confidential track |
| 19 | Health | Spec §22 | 🟡 | No vaccination schedule, no BMI tracking, no clinic visit log, no counsellor confidentiality boundary |
| 20 | Inventory | Spec §24 | 🟡 | No indent→PO→GRN chain, no vendor master, no asset register, no re-order alerts |
| 21 | Expenses | Spec §25 | 🟡 | No multi-level approval, no ₹ thresholds, no petty cash, no GST input credit, no P&L |
| 22 | Visitors / Front Office | Spec §26 | 🟡 | No gate-pass QR, no pre-approved list, **no OTP-based student dispatch** (a child-safety feature), no courier/lost-and-found |
| 23 | Certificates | Spec §28 | 🟡 | No no-dues check chain, no TC register with serial, no template designer, no public QR verification |
| 24 | Events & Gallery | Spec §23 | 🟡 | No registration/e-ticket, no gallery, no consent/face-blur controls |
| 25 | Alumni | Spec §29 | 🔴 | 38-line controller. No directory, donations, or mentorship |
| 26 | Tasks | Spec §27 | 🔴 | 41-line controller. No recurrence, comments, or workload view |
| 27 | Approvals engine | RBAC §5 | 🔴 | Single-step only; handles `Leave` and `Expense` only; hardcoded approver roles; **none** of the 9 workflows or ₹ escalation thresholds |
| 28 | Reports & Analytics | Spec §30 | 🟡 | No scheduled reports, no report builder, no board/govt reports, no AI insights |
| 29 | Audit & Compliance | Spec §36, RBAC §6 | 🟡 | Audit log has no before/after diff, is mutable, has no retention policy; no DPDP consent, no Aadhaar unmask flow, no MFA gating on critical actions |
| 30 | Super Admin console | Plan §8 | 🟡 | No billing, invoicing, dunning, or impersonation |
| 31 | Website builder | Spec §33 | ⚫ | Deferred to v2 |
| 32 | AI features | Plan §22 | ⚫ | Deferred to v2 |
| 33 | Mobile apps (Flutter) | Spec §31 | ⚫ | Not started |

**Summary:** 28 of 33 modules have *some* code. None of them are complete. The pattern is
consistent — routes and a UI page exist, the controller does 20% of the specified
behaviour, and the enforcement/integration layer beneath is missing entirely.

---

## 8. Confirmed defects in the current build

These were verified by reading the code, not inferred. Each one gets a named regression
test in the e2e verification document.

### 8.1 Data-scope enforcement does not exist *(severity: critical, security)*

`middleware/rbac.js` computes `req.rbacScope` (line 73) and `req.branchFilter` (line 100)
on every request. **Zero controllers read either value** — verified by grep across all 36
controllers. Every controller filters on `tenantId` alone.

Consequences:
- A Branch A principal lists Branch B's students. Multi-branch isolation is not enforced.
- A Class Teacher with `dataScope: 'division'` lists the entire school.
- An HoD with `dataScope: 'department'` sees every department.

Only the module × action gate works. The three scope dimensions the entire RBAC document is
built around are decorative. **This is the single most important fix in the project** and
the reason D6 mandates a central scope resolver rather than per-controller filtering.

### 8.2 Fee concession is broken end-to-end *(severity: critical, correctness)*

`controllers/fee.controller.js:159–169`:

```js
demand.concession = Math.min(concessionAmount, demand.totalAmount);   // ← field does not exist
demand.totalDue = Math.max(0, demand.totalAmount - demand.concession - (demand.paidAmount || 0));
                                                //  ↑ undefined       //  ↑ field does not exist
```

`FeeDemand` declares `concessionAmount` and `totalPaid`. Mongoose strict mode silently
discards both writes, so `demand.concession` reads back `undefined`, the arithmetic yields
`NaN`, and `Math.max(0, NaN)` is `NaN` — which fails to cast on `save()`. The route is
wired (`fee.routes.js:17`), the UI page exists (`FeeConcessionPage.tsx`), and it returns
500. The `paidAmount`/`totalPaid` mismatch would additionally have wiped out recorded
payments if the write had succeeded.

### 8.3 Receipt numbers race *(severity: critical, financial)*

`fee.controller.js:126–128` reads the highest existing receipt number, increments it in
application code, and writes — with no unique index, no transaction, and no retry. Two
cashiers collecting simultaneously produce duplicate `RCP000123`. `FeePayment` creation and
the `FeeDemand` balance update are two separate writes with no transaction between them; a
crash in between records money received against an unchanged balance.

`docs/workflows/fee-collection-flow.md` explicitly requires an idempotency key and an
immutable per-branch receipt sequence. Neither exists.

### 8.4 `school_owner` is locked out *(severity: high)*

`User.role` accepts `school_owner`; `Permission.role`'s enum does not include it and
`seed-permissions.js` seeds no rows for it. `checkPermission` finds no permission document
and returns 403 for every module; the frontend receives an empty `permissionMap` and renders
an empty sidebar. Separately, `applyBranchScope` grants all-branch access to the role string
`'trustee'`, which no enum accepts — dead code guarding a role that cannot exist.

### 8.5 Marks have no lock and no validation *(severity: high)*

`marks.controller.js#bulkSave` upserts unconditionally: it overwrites entries already in
`verified` status, never checks `marksObtained <= maxMarks`, and records no previous value.
The RBAC doc's mark-correction workflow (§5.4: teacher → HoD → Exam Coordinator → Principal,
24-hour unlock window, immutable old/new log) is entirely absent, as is the
`/exams/{id}/marks/lock` endpoint that `openapi.yaml` documents.

### 8.6 `reportCard` dereferences a possibly-null exam *(severity: medium)*

`marks.controller.js:124` uses `exam._id` inside the aggregation while only `student` is
null-checked (line 114). An invalid `examId` yields a `TypeError` and a 500 instead of a 404.

### 8.7 No external integrations exist *(severity: high, product)*

Verified by grep: no HTTP client is called anywhere in `backend/src`. `Tenant.integrations`
stores Razorpay, Cashfree, MSG91, WhatsApp, SMTP and Google Maps credentials that no code
reads. There is no queue, no cron, and no scheduler. Consequently **every notification in
every flow document is unimplemented** — absence SMS, fee reminders, result publication,
bus-approaching alerts, payslip delivery.

### 8.8 Auth is missing half its specified surface *(severity: high, security)*

Implemented: login, register, me, change-password. Missing: refresh token, MFA, forgot
password, reset password, account lockout after failed attempts, session listing/revocation,
and token-version invalidation on role change. `openapi.yaml` documents four of these;
Plan.docx §7 specifies all of them, including 15-minute access tokens (the code issues 7-day
tokens) and MFA as mandatory for Super Admin, School Admin, Principal, Accountant and HR.

### 8.9 No request validation *(severity: high)*

`zod` is a declared dependency of both apps and is imported **nowhere** in
`backend/src`. Controllers read `req.body` directly into Mongoose. `createStructure` spreads
the raw body into `FeeStructure.create`. There is no allow-list on any write path.

### 8.10 Approvals engine is a stub *(severity: high)*

`approval.controller.js` supports exactly one approval step, hardcodes the approver set as
a JavaScript array (`['principal','vice_principal','hr_manager','accountant','hod']`)
instead of consulting RBAC, and its `syncSourceRecord` handles only `Leave` and `Expense`.
The RBAC doc specifies 9 multi-level workflows with maker-checker separation and
configurable ₹ escalation thresholds (Appendix B).

### 8.11 Frontend route guards are inconsistent *(severity: medium)*

`App.tsx` wraps only Fees, Exams, and 5 other routes in `<ModuleRoute>`. Students,
Attendance, HR, Payroll, Library, Transport, Settings, Audit Logs and Approvals have **no
guard** — any authenticated user can navigate to `/hr/payroll` and get a broken page whose
API calls 403. Additionally `auth.store.ts#hasModule` returns `true` when
`enabledModules` is empty, so a misconfigured tenant fails **open**.

### 8.12 React hooks-order violation *(severity: medium)*

`DashboardPage.tsx` returns from a `switch` on `user.role` at lines 37–58, then calls
`useQuery` at line 60. The hook count varies by role, so any render where the role changes
(login, impersonation, role switch) throws *"Rendered more hooks than during the previous
render."*

### 8.13 Repository is in a broken git state *(severity: blocking)*

`frontend/src/pages/onboarding/OnboardingWizard.tsx` and
`frontend/src/pages/students/StudentsPage.tsx` are recorded as **unmerged** in the index
(stages 1/2/3 present via `git ls-files -u`) while `.git/MERGE_HEAD` is absent. The
working-tree files are clean — the conflicts were resolved but never staged. `git commit`
will refuse until both are `git add`ed.

---

## 9. Definition of Done for a module

Per **D2**, a module is not started until the previous one satisfies **every** line below.
This checklist is the contract; the e2e verification document is how it is evidenced.

**Domain**
- [ ] Mongoose schemas cover the fields specified in `Enterprise_School_ERP_Indian_Specification_v2.md` for that module, with indexes for every query the module issues.
- [ ] Every tenant-scoped collection carries `tenantId` **and** `branchId`, and `academicYearId` where the data is year-bound.
- [ ] Soft delete (`deletedAt`) with a partial unique index where uniqueness applies.

**API**
- [ ] Every route declares `checkPermission(module, action)` and, for mutations, `audit(module, action)`.
- [ ] Every write path has a zod schema. No raw `req.body` reaches a model.
- [ ] Every list endpoint paginates, and every query goes through the scope resolver — no controller assembles its own tenant/branch filter.
- [ ] Multi-write operations run inside a transaction. Money and enrolment operations additionally accept an `Idempotency-Key`.
- [ ] Responses use `shared/response.js`; errors are thrown as `shared/errors.js` classes.

**RBAC**
- [ ] The module appears in the permission matrix for all 12 system roles and every relevant template.
- [ ] `branchScope`, `dataScope` and `studentScope` are each verified against at least one role that is *restricted* on that dimension.

**Frontend**
- [ ] Every route is wrapped in `<ModuleRoute module=… action=… />`.
- [ ] Every action button is gated by `can(module, action)` — no button renders that the API will reject.
- [ ] Loading, empty, filtered-empty, error, 403 and module-disabled states are implemented (wireframe WF-0275…WF-0281).
- [ ] Calls go through a typed service in `services/`; no page imports `lib/api` directly.

**Quality**
- [ ] Integration tests cover the happy path, each RBAC boundary, and each documented edge case.
- [ ] The module's section of the e2e verification checklist passes and is signed off.
- [ ] `openapi.yaml` regenerates cleanly and matches the implementation.
- [ ] Any workflow document for the module is updated from `TARGET` to `CURRENT`.

---

## 10. Delivery plan

Ordered by dependency, not by business value — you cannot build Fees correctly before
Enrolment exists, and you cannot build anything correctly before the scope engine exists.

### Phase 0 — Platform foundation *(prerequisite for D2; not a business module)*

Module-by-module delivery requires the shared machinery to exist first, or every module
re-invents it and the first eight modules get rewritten.

| Item | Resolves |
|---|---|
| **Scope resolver** — central, mandatory, applies tenant + branch + data + student scope | §8.1, D6 |
| **RBAC v2** — multi-role resolution, custom roles, delegation, permission cache invalidation | §5.3, §8.4 |
| **Validation layer** — zod schema per route, shared error mapping | §8.9 |
| **Auth v2** — refresh tokens, MFA, forgot/reset, lockout, token version, session list | §8.8 |
| **Transaction + idempotency helpers**, atomic sequence generator for receipts/serials | §8.3 |
| **Job scheduler + in-process event bus** (Plan.docx Appendix C events) | §8.7, D10 |
| **Integration adapter layer** — payment / SMS / WhatsApp / email / storage, with no-op drivers | D4 |
| **Audit v2** — before/after diff, append-only, retention per RBAC §6.3 | §8.10 |
| **Test harness** — Vitest + supertest + `mongodb-memory-server`, seeded fixtures per role | §9 |
| Fix §8.11, §8.12, §8.13 | housekeeping |

### Phases 1–N — Business modules, one at a time

| Order | Module | Why here | Key deliverables |
|---|---|---|---|
| 1 | **Tenant & Onboarding** | Everything is scoped by it | `institutionType`, branches, plan→module gating, setup wizard, branding |
| 2 | **Identity & RBAC** | Everything is gated by it | 12 system roles, 23 templates, custom-role UI, multi-role, impersonation |
| 3 | **Academic Structure** | Everything references it | `AcademicGroup`, `Enrolment`, terms, holiday calendar, houses, subjects, year rollover |
| 4 | **Students** | The core record | 360° profile, documents vault, timeline, ID cards, promotion, bulk import |
| 5 | **Admissions** | Creates students | Enquiry→application→document verification→offer→payment→enrolment, RTE track, dedup, capacity lock |
| 6 | **Fees & Accounting** | Highest business risk, most broken | All 4 fee shapes, concessions with approval, GST, gateway, receipts, day book, ledger, refunds, defaulters |
| 7 | **Attendance** | Daily driver | Multi-source ingestion, absence alerts, long-absence, staff attendance, corrections |
| 8 | **Communication** | Every module above needs it | SMS/WhatsApp/email/push dispatch, DLT templates, quiet hours, throttle, notices, chat |
| 9 | **Timetable** | Feeds attendance and exams | Period config, auto-generation, conflict detection, substitution, exam date sheet |
| 10 | **Exams & Results** | Board-critical | Grading engine, marks lock, approval gate, report-card designer, revaluation, analytics |
| 11 | **HR & Payroll** | Money + compliance | Salary structure, PF/ESIC/PT/TDS, maker-checker, Form 16, NEFT file, leave |
| 12 | **Homework & LMS** | Teacher/student daily use | Submissions, rubrics, materials, quizzes, live classes |
| 13 | **Library** | Self-contained | Barcode, issue/return, fines, reservations, stock audit |
| 14 | **Transport** | Needs Flutter driver app | Routes, allocation, GPS, boarding, live tracking, document expiry |
| 15 | **Hostel & Meals** | Self-contained | Allocation, roll call, gate pass with parent OTP, mess |
| 16 | **Front Office & Certificates** | Child safety | Visitors, gate-pass QR, OTP dispatch, TC with no-dues chain, public QR verification |
| 17 | **Inventory & Expenses** | Back office | Indent→PO→GRN, vendors, assets, multi-level approval with thresholds |
| 18 | **Discipline, Health, Counselling** | Sensitive data | Merit/demerit, POSH/ICC confidential track, vaccinations, clinic log |
| 19 | **Events, Alumni, Tasks** | Long tail | Registration, gallery with consent, directory, donations, recurring tasks |
| 20 | **Reports & Analytics** | Needs everything above | Standard reports, scheduled delivery, report builder, board/RTE reports |
| 21 | **Super Admin & Billing** | Revenue | Provisioning, plans, invoicing, dunning, health, security centre |

### Mobile (Flutter) — parallel track

Starts once Phase 7 (Attendance) is done, since that is the first module with enough
substance for a teacher app. Order: **Parent → Teacher → Student → Driver → Admin**, mirroring
wireframes WF-0232…WF-0274.

---

## 11. Explicitly out of scope for v1

Recorded so nobody re-litigates them mid-build:

| Item | Why deferred |
|---|---|
| Website builder (Spec §33) | Large surface, no dependency on the ERP core, sellable as an add-on later |
| AI features — timetable generator, at-risk prediction, chat assistant, AI remarks (Plan §22) | Needs a populated data warehouse; premature before real tenants |
| Mid-Day Meal / PM POSHAN, UDISE+ export, MDM & UDISE roles | Govt/Aided segment, deferred per D5 |
| IB (1–7) and Cambridge (IGCSE) grading engines | v2 segment. The grading engine is pluggable, so this is additive |
| Kafka event bus, microservice split, PostgreSQL migration | Per D1; in-process event bus now, publishers unchanged when swapped |
| Kubernetes / multi-region DR | Premature. Single-region containerised deploy for v1 |
| Face recognition attendance | Biometric and RFID first; face recognition adds vendor + consent complexity |
| SSO (Google Workspace / Microsoft 365) | Enterprise ask; revisit when a customer needs it |

---

## 12. Open questions

Answers wanted before the corresponding module starts. None block Phase 0.

| # | Question | Blocks | Default if unanswered |
|---|---|---|---|
| Q1 | Which payment gateway account do you actually hold — Razorpay, Cashfree, PayU? | Phase 6 (Fees) | Razorpay adapter first; others are additional drivers |
| Q2 | Do you have a DLT-registered SMS sender ID and approved templates yet? Registration takes days on the TRAI side. | Phase 8 (Communication) | Build against MSG91 sandbox; template registry designed to accept DLT template IDs |
| Q3 | WhatsApp: official Cloud API, or a BSP (WATI / Interakt / 360dialog)? | Phase 8 | Cloud API adapter; BSPs are additional drivers |
| Q4 | Pricing model — the two docs disagree: ₹15–25/student/**month** (Plan.docx §6.2) vs. per student per **year** (Spec §35.1, and `Plan.pricePerStudentPerYear` in code). Which is real? | Phase 21 (Billing) | Per student per year, matching the code |
| Q5 | Which regional languages for v1 UI and SMS? Spec §34 lists 11. | Phase 8 | English + Hindi + Gujarati |
| Q6 | Is a data migration from an existing system needed for your first customer (Tally / Excel / legacy ERP, per Spec §35.2)? | Phase 4 (Students) | Excel import only |
| Q7 | Do you have a first design customer, and are they school, coaching, or both? | Prioritisation within phases | Assume private CBSE school, single branch |
| Q8 | Hosting target — AWS ap-south-1 (Plan.docx §23) or something else? DPDP requires Indian data residency. | Phase 0 (CI/CD) | Single-region Indian cloud, containerised |

---

## Approval

This document is **not approved for implementation** until signed off. On approval, work
begins at Phase 0.

| Role | Name | Date | Signature |
|---|---|---|---|
| Product owner | | | |
| Technical lead | | | |
