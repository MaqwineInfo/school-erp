# School ERP — End-to-End Verification Plan

**Status:** Draft for approval
**Date:** 2026-08-15
**Companion documents:** [`../feature-brainstorm.md`](../feature-brainstorm.md) · [`../architecture/system-architecture.md`](../architecture/system-architecture.md)

This is how we prove the system works. The repository has **no automated test suite today**,
so verification is checklist-driven until the harness described in architecture §20 exists —
at which point most of Part B and Part C below become generated tests and this document
becomes the specification for them.

**Rule:** a module is not "done" until its section here passes and is signed off by a second
person. A green checklist filled in by the person who wrote the code is not evidence.

---

## Table of Contents

- [How to use this document](#how-to-use-this-document)
- [Part 0 — Environment and fixtures](#part-0--environment-and-fixtures)
- [Part A — Regression suite for known defects](#part-a--regression-suite-for-known-defects)
- [Part B — Cross-cutting suites](#part-b--cross-cutting-suites)
  - [B1 Tenant isolation](#b1-tenant-isolation)
  - [B2 Branch isolation](#b2-branch-isolation)
  - [B3 Data scope](#b3-data-scope)
  - [B4 Student scope](#b4-student-scope)
  - [B5 RBAC action matrix](#b5-rbac-action-matrix)
  - [B6 Module gating](#b6-module-gating)
  - [B7 Authentication and session](#b7-authentication-and-session)
  - [B8 API contract](#b8-api-contract)
  - [B9 Audit trail](#b9-audit-trail)
  - [B10 Frontend guard parity](#b10-frontend-guard-parity)
- [Part C — Module verification checklists](#part-c--module-verification-checklists)
- [Part D — Golden journeys](#part-d--golden-journeys)
- [Part E — Non-functional verification](#part-e--non-functional-verification)
- [Sign-off register](#sign-off-register)

---

## How to use this document

| Symbol | Meaning |
|---|---|
| ☐ | Not verified |
| ✅ | Verified, evidence attached (screenshot, response body, or test name) |
| ❌ | Failed — raise a defect, do not sign off |
| N/A | Not applicable to this tenant configuration (state why) |

Each check states **what to do**, **what must happen**, and — critically — **what must NOT
happen**. Most security defects in this codebase are absence-of-failure defects: the request
succeeded when it should have been refused.

Record evidence as the HTTP status + the relevant slice of the response body, or the name of
the automated test once one exists.

---

## Part 0 — Environment and fixtures

### 0.1 Prerequisites

```bash
# MongoDB must be a REPLICA SET — transactions do not work on a standalone.
# Single-node replica set is fine for local work.
mongod --replSet rs0 --dbpath ./data
mongosh --eval 'rs.initiate()'

cd backend  && npm install && cp .env.example .env && npm run seed:full && npm run dev
cd frontend && npm install && npm run dev
```

☐ Backend starts on :5000 without warnings
☐ Frontend starts on :3000 and proxies `/api` to :5000
☐ `GET /api/v1/health` returns 200
☐ `GET /api/v1/health/ready` reports Mongo, storage and adapters
☐ Startup fails cleanly if `JWT_SECRET` is unset *(must not fall back to a default)*

### 0.2 Required fixture data

The verification suites below are meaningless without data that spans the boundaries being
tested. `seed:full` must produce **at minimum**:

| Fixture | Why |
|---|---|
| **2 tenants** — `alpha`, `beta` | Tenant isolation (B1) |
| **2 branches in `alpha`** — Main, North | Branch isolation (B2) |
| **2 academic years** — one active, one closed | Temporal scope, promotion, history |
| **2 standards × 2 sections each** in each branch | Data scope (B3) |
| **≥5 students per section**, at least one RTE and one with a sibling | Student scope (B4), concessions |
| **1 coaching course + 2 batches** in a tenant with `institutionType: coaching` | §6 duality |
| **1 user per system role**, plus these specifically scoped users: | RBAC matrix (B5) |
| — Class Teacher of `Main / Std 8 / A` only | dataScope `division` |
| — Subject Teacher teaching only Maths in `Std 8 A` and `Std 9 A` | dataScope `own` |
| — HoD of Science only | dataScope `department` |
| — Principal of Main branch only | branchScope `own_branch` |
| — Trustee across both branches | branchScope `all_branches` |
| — Parent linked to exactly 2 children, one per branch | studentScope `own_children` |
| — A user holding **two roles** (Teacher + Exam Coordinator) | multi-role resolution |
| **Fee structures, demands and payments** in both branches | Money suites |
| **A tenant with `fees` disabled in its plan** | Module gating (B6) |

☐ All fixtures present and documented in `seed-full.js`
☐ Seed is idempotent — running twice produces the same state, not duplicates
☐ Seeded credentials are printed at the end of the seed run

---

## Automated coverage — 2026-08-15

Most of Part A is no longer a manual checklist: it is an executing test suite.

```bash
cd backend && npm test          # Vitest + in-memory MongoDB replica set
cd backend && npm run lint      # 0 errors
cd frontend && npm run build    # tsc -b && vite build
```

| Suite | File | Covers |
|---|---|---|
| Scope enforcement | `tests/scope.test.js` | A1, A2, B1–B4 |
| RBAC matrix & multi-role | `tests/rbac.test.js` | A5, B5 |
| Platform primitives | `tests/platform.test.js` | A4, A10, B9 (sequences, transactions, money, validation, audit, encryption) |
| Academic structure | `tests/academics.test.js` | C3 (enrolment invariants, capacity under concurrency, promotion history) |
| Fees | `tests/fees.test.js` | **A3, A4**, C6 |
| Exams & marks | `tests/exams.test.js` | **A6, A7**, C10 |
| Approvals | `tests/approvals.test.js` | **A11** |
| Attendance | `tests/attendance.test.js` | C7 |
| Communication | `tests/communication.test.js` | **A8**, C8 |
| Authentication | `tests/auth.test.js` | **A9**, B7 |

**Not yet automated:** B6 module gating, B8 API contract, B10 frontend guard parity,
Part D golden journeys, Part E non-functional. These remain manual until the modules they
depend on are built.

**Fixture note:** the suite runs `bcrypt` at cost 4 (`tests/setup.js`). Production uses 12.
A suite that hashes on every login, password change and reset is otherwise unusably slow.

---

## Part A — Regression suite for known defects

Each item below is a **confirmed defect** in the current build (feature brainstorm §8).
These are the first tests to write and the last to be allowed to regress.

### A1 — Data scope is enforced *(critical, security)*

☐ Log in as the **Class Teacher of Std 8 A**. `GET /api/v1/students`
&nbsp;&nbsp;→ **must** return only Std 8 A students.
&nbsp;&nbsp;→ **must not** return the whole school. *(Currently it returns the whole school.)*
☐ Same user: `GET /api/v1/students?standardId=<Std 9>` → empty, not Std 9's roster.
☐ Same user: `GET /api/v1/students/<a Std 9 student id>` → **404**, not 200.
☐ Same user: `PUT /api/v1/students/<a Std 9 student id>` → **404**, and the record is unchanged.
☐ Log in as **HoD (Science)**. Marks lists return Science subjects only.
☐ Log in as **Subject Teacher**. Attendance lists cover only their assigned groups.
☐ Grep check: no controller constructs its own `{ tenantId: … }` filter — all queries go through a repository.

### A2 — Branch isolation is enforced *(critical, security)*

☐ Log in as **Principal of Main branch**. `GET /api/v1/students`
&nbsp;&nbsp;→ **must not** include any North branch student. *(Currently it does.)*
☐ Same for `/fees/demands`, `/attendance`, `/hr/staff`, `/exams`, `/reports/*`.
☐ Direct fetch of a North branch student by id → **404**.
☐ `POST /api/v1/students` as Main Principal with `branchId: <North>` in the body → the branch is
&nbsp;&nbsp;taken from scope and ignored from the body; the student lands in Main.
☐ **Trustee** (`all_branches`) sees both branches, and `X-Branch-Id: <Main>` narrows the result.

### A3 — Fee concession works *(critical, correctness)*

☐ Create a demand: total ₹10,000, record a ₹4,000 payment. Balance is ₹6,000.
☐ `PATCH /api/v1/fees/demands/:id/concession` with `{ concessionAmount: 200000 }` (₹2,000 in paise)
&nbsp;&nbsp;→ **200**, not 500. *(Currently 500 — `NaN` cast error.)*
&nbsp;&nbsp;→ `concessionAmount` = 200000 and **persists after reload**. *(Currently silently dropped.)*
&nbsp;&nbsp;→ `totalDue` = ₹4,000 — i.e. `total − concession − paid`. **The ₹4,000 already paid is
&nbsp;&nbsp;still credited.** *(The old code read a non-existent `paidAmount`, which would have
&nbsp;&nbsp;discarded it.)*
&nbsp;&nbsp;→ `totalPaid` is unchanged at ₹4,000.
☐ Concession exceeding the balance is rejected with **422 `BUSINESS_RULE`**, not silently clamped.
☐ A concession above the tenant's threshold creates an `ApprovalRequest` and does **not** apply until approved.
☐ The audit row records before, after, amount, reason and approver.

### A4 — Receipt numbers are unique under concurrency *(critical, financial)*

☐ Fire **50 concurrent** `POST /api/v1/fees/payments/collect` requests.
&nbsp;&nbsp;→ 50 distinct receipt numbers. *(Currently duplicates — read-then-write race.)*
&nbsp;&nbsp;→ No gaps attributable to lost writes.
☐ A unique index exists on `{ tenantId, branchId, receiptNo }` — verify a manual duplicate insert fails.
☐ Kill the process between the payment write and the demand update
&nbsp;&nbsp;→ on restart, **neither** is present (transaction rolled back), never the payment alone.
☐ Replay the same `Idempotency-Key` → the original receipt is returned, no second payment is created.
☐ Receipt numbers are per branch and per financial year, and never reused.

### A5 — No role is locked out *(high)*

☐ For **each** of the 12 system roles and each seeded template role: log in, land on a dashboard,
&nbsp;&nbsp;and see a non-empty sidebar. *(Currently `school_owner` gets an empty sidebar and 403 everywhere.)*
☐ No role string exists in `User.role` that has no permission definition — assert programmatically.
☐ No permission definition exists for a role string `User.role` will not accept.
☐ Grep check: no hard-coded role-name branch survives in `platform/scope/**` *(today `applyBranchScope`
&nbsp;&nbsp;tests for `'trustee'`, a role no enum accepts)*.

### A6 — Marks are locked and validated *(high)*

☐ Enter marks, verify/lock them, then re-submit the same entries
&nbsp;&nbsp;→ **422 `BUSINESS_RULE`**, values unchanged. *(Currently overwritten silently.)*
☐ Submit `marksObtained: 105` with `maxMarks: 100` → **400 `VALIDATION_ERROR`**. *(Currently accepted.)*
☐ Submit a negative mark → 400.
☐ Submit for a student not enrolled in the selected group → 422.
☐ Correct a locked mark → an `ApprovalRequest` is created; the value changes only after approval;
&nbsp;&nbsp;the audit row carries old value, new value, reason and the full approver chain.
☐ The unlock window expires automatically after 24 hours.

### A7 — Invalid ids return 404, not 500 *(medium)*

☐ `GET /api/v1/exams/marks/:studentId/result-card?examId=<non-existent>` → **404**.
&nbsp;&nbsp;*(Currently a `TypeError` 500 — `exam._id` is dereferenced before the null check.)*
☐ Sweep every `:id` route with a valid-format-but-absent ObjectId → 404, never 500.
☐ Sweep every `:id` route with a malformed id → 400, never 500.

### A8 — Notifications are actually dispatched *(high, product)*

☐ Mark a student absent → a `Notification` row is created for the parent within 30 minutes,
&nbsp;&nbsp;with provider id and delivery status. *(Currently nothing is sent — no adapter exists.)*
☐ With the `noop` driver: the send is logged and recorded, no external call is made, no error.
☐ With the sandbox driver: the provider returns an id and it is stored.
☐ An SMS without a registered DLT template id is **rejected by the adapter**, not by the carrier.
☐ Quiet hours (21:00–07:00) suppress non-critical messages; critical alerts bypass.
☐ The daily per-recipient throttle (5 non-critical) is enforced.

### A9 — Auth surface is complete *(high, security)*

☐ `POST /auth/refresh` rotates the refresh token and issues a new access token.
☐ Access token expires in **15 minutes**, not 7 days.
☐ Changing a password or a role bumps `tokenVersion`; existing tokens are rejected immediately.
☐ `POST /auth/forgot-password` and `/auth/reset` work, and the response never reveals whether the email exists.
☐ 5 failed logins → 15-minute lockout; the attempts are logged.
☐ MFA is enforced for every role in the mandatory tiers.
☐ `GET /auth/sessions` lists active sessions; revoking one invalidates that device only.

### A10 — Every write is validated *(high)*

☐ `POST /api/v1/fees/structures` with an unexpected field → the field is rejected or stripped, never persisted.
☐ Every write route has a zod schema — assert programmatically over the route registry.
☐ Sending a string where a number is expected → 400 with a per-field error, never a 500 cast error.
☐ Sending `tenantId` or `branchId` in a body → ignored; scope wins.

### A11 — Approvals are multi-level *(high)*

☐ A fee waiver under the threshold approves in one step; above it, it escalates to level 2.
☐ The user who *prepared* a payroll run **cannot** approve it (maker ≠ checker).
☐ All 9 workflows from RBAC §5 exist and route to the correct approver by RBAC, not by a hard-coded list.
☐ Approving publishes an event; the owning module applies the change; the approvals module writes no foreign data.
☐ SLA breach triggers escalation.

### A12 — Frontend guards match the API *(medium)*

☐ For **every** route in the app, an unauthorised role navigating directly to the URL sees the
&nbsp;&nbsp;403 state — not a broken page. *(Currently only 7 routes are guarded.)*
☐ No action button renders that the API would reject for that role.
☐ A tenant with `enabledModules: []` sees **nothing**, not everything.
&nbsp;&nbsp;*(Currently `hasModule` returns `true` for an empty list — fails open.)*
☐ Switching roles or impersonating does not throw a React hooks error.
&nbsp;&nbsp;*(Currently `DashboardPage` calls `useQuery` after conditional returns.)*

### A13 — Repository hygiene *(blocking)*

☐ `git status` is clean — no files unmerged in the index.
&nbsp;&nbsp;*(Currently `OnboardingWizard.tsx` and `StudentsPage.tsx` are at stages 1/2/3 with no `MERGE_HEAD`;
&nbsp;&nbsp;the working tree is clean but `git commit` refuses.)*
☐ `npm run lint` passes in both `backend/` and `frontend/`.
☐ `npm run build` passes in `frontend/`.
☐ No committed credentials.

---

## Part B — Cross-cutting suites

Run these against **every** module. They are the suites most worth generating.

### B1 Tenant isolation

☐ A user of tenant `alpha` never sees a single document belonging to tenant `beta` — sweep every list endpoint.
☐ Fetching a `beta` document by id as an `alpha` user → 404.
☐ `X-Tenant-Id` is honoured **only** for `super_admin`, and only during an audited impersonation.
☐ Every collection has `tenantId` and an index that leads with it.
☐ Aggregation pipelines match `tenantId` in the **first** `$match` stage.

### B2 Branch isolation

☐ `own_branch` roles see one branch; `all_branches` roles see all; `assigned_branches` roles see their list.
☐ `X-Branch-Id` narrows within an all-branches scope and **cannot widen** an own-branch scope.
☐ Cross-branch access by a Trustee is audited per RBAC §6.4.
☐ Reports aggregate only in-scope branches.
☐ Inter-branch student transfer moves the record and leaves read-only history at the source.

### B3 Data scope

| Scope | Role in fixtures | Must see | Must NOT see |
|---|---|---|---|
| `group` | Trustee | All branches | Other tenants |
| `school` | Principal | Whole branch | Other branches |
| `department` | HoD (Science) | Science subjects, staff, marks | Commerce equivalents |
| `division` | Class Teacher 8-A | 8-A only | 8-B, Std 9 |
| `own` | Subject Teacher | Own subject-group pairs | Other subjects in the same class |

☐ Each row verified on list, detail, update and delete.
☐ Verified on **exports** as well as reads — an export is the easiest scope leak.

### B4 Student scope

☐ **Parent** sees exactly their 2 linked children, across branches, and no one else.
☐ A parent requesting another student's marks/fees/attendance by id → 404.
☐ **Student** sees only their own record.
☐ A student cannot pay fees (specification §11: view summary only, no payment by a minor).
☐ `assigned_students` roles see only their assigned set.
☐ Verified on: students, attendance, marks, fees, homework, certificates, transport, library.

### B5 RBAC action matrix

For every (role × module × action) in the seed matrix:

☐ Allowed combinations return 2xx.
☐ Denied combinations return **403 `FORBIDDEN`** — never 200, never 500.
☐ Generated from the same source as the seed, so tests cannot drift from configuration.
☐ **Multi-role user (Teacher + Exam Coordinator):** additive actions are the union; `delete` on
&nbsp;&nbsp;fees/payroll/examinations/certificates is the intersection; scope is the widest per dimension.
☐ A custom role cloned from a template behaves identically to the template.
☐ Editing a role takes effect **immediately** — no stale-cache window on a revocation.
☐ Critical actions (RBAC §6.1) require step-up MFA and a reason.

### B6 Module gating

☐ For the tenant with `fees` disabled: every `/fees/*` endpoint returns **403 `MODULE_DISABLED`**
&nbsp;&nbsp;(not `FORBIDDEN` — the codes are distinct and the UI renders different states).
☐ The Fees menu is absent from the sidebar and routes render the module-disabled state (WF-0281).
☐ Re-enabling restores access **and historical data** — nothing was destroyed by the toggle.
☐ A module toggle reflects in the UI within 30 seconds (Plan.docx §8 acceptance criterion).

### B7 Authentication and session

☐ Login, refresh, logout, forgot, reset, MFA enrol, MFA verify all work.
☐ Expired access token → 401 `UNAUTHENTICATED`, and the client refreshes silently.
☐ Deactivated user → immediately rejected even with a valid token.
☐ Parent phone-OTP login works without a password.
☐ Impersonation shows the banner, is audited at start and end, and cannot be nested.

### B8 API contract

☐ `openapi.yaml` regenerates and matches the implementation — CI fails on any diff.
☐ Every success body is `{ success, data, message?, meta? }`.
☐ Every error body is `{ success: false, error: { code, message, details } }`.
☐ Every list endpoint paginates. **No unbounded list exists** *(today `/fees/defaulters` returns every row)*.
☐ All nine error codes from architecture §16 are reachable and correct.
☐ `X-Request-Id` echoes back and appears in the logs for that request.

### B9 Audit trail

☐ Every mutation writes an audit row with **before, after and diff**.
☐ Critical actions are tagged `critical` and carry a reason.
☐ Audit rows cannot be updated or deleted through any API, by any role including `super_admin`.
☐ Retention periods per RBAC §6.3 are set on write and enforced by the sweep job.
☐ Audit export is restricted to the Compliance Officer, and the export itself is audited.
☐ PII access (Aadhaar unmask, health record view) is logged per view.

### B10 Frontend guard parity

☐ Every route in the route registry declares a module and an action.
☐ For every role, the set of reachable routes equals the set of permitted API surfaces — no more, no less.
☐ All six system states render: loading, empty, filtered-empty, error, 403, module-disabled.
☐ Pages import module services only — no direct `lib/api` import (lint-enforced).
☐ Every role dashboard is backed by a real endpoint *(today 12 of the 17 are static link tiles with
&nbsp;&nbsp;no data, and `studentDashboard` returns `"coming soon"`)*.

---

## Part C — Module verification checklists

Ordered as in the delivery plan. Each module also runs **all** of Part B.

### C1 Tenant & Onboarding
☐ Provision a tenant end-to-end; it is usable within 5 minutes (Plan.docx §8).
☐ `institutionType` switches labels: Class/Section for `school`, Course/Batch for `coaching`.
☐ A `both` tenant runs day school and evening batches side by side.
☐ Plan change adds/removes modules immediately; historical data survives.
☐ Setup wizard is resumable and its steps are idempotent.
☐ Branding (logo, colours, custom domain) applies to the UI, receipts and certificates.
☐ Integration credentials are **encrypted at rest** and never returned by any API.

### C2 Identity & RBAC
☐ Create, clone, edit and delete a custom role; all 23 templates seed correctly.
☐ Assign multiple roles to one user; resolution follows §7.3.
☐ Scope a role binding to specific branches, groups or departments.
☐ Delegation grants and **auto-expires**.
☐ Impersonation is audited and banner-visible.
☐ A role change bumps `tokenVersion` and invalidates the RBAC cache immediately.
☐ Bulk staff import creates users with correct roles and sends invites.

### C3 Academic Structure
☐ Create academic year, terms, holiday calendar, working-Saturday pattern.
☐ Create standards Nursery(0) → Std 12 with correct `order` and stage.
☐ Create sections; **rename a section and confirm no attendance/timetable/marks record is orphaned**.
☐ Create a coaching course and batches.
☐ Enrol a student; the single-active-enrolment invariant is enforced (a second active enrolment is rejected).
☐ Section capacity blocks over-allocation, including under **concurrent** enrolment.
☐ Year rollover: promote a cohort; **the previous year's roster remains queryable**.
☐ Detention/retention keeps a student in place while their peers advance.
☐ Houses and house points work.

### C4 Students
☐ 360° profile loads in <500 ms with all aggregates (Plan.docx §11).
☐ All specification §5 field groups present: identity, personal, addresses, guardians, health, documents, timeline.
☐ Aadhaar displays masked; unmask requires Compliance Officer + step-up MFA + is logged per view.
☐ Documents vault: upload, verify, expire; files served by signed URL, never from the app process.
☐ ID card generates with photo, QR, blood group; bulk print for a section.
☐ Bulk Excel import validates row-by-row and is **transactional for the batch**.
☐ Promotion is transactional across attendance, marks and fees.
☐ Withdrawal keeps a read-only profile for 7 years.
☐ Timeline records every lifecycle event.

### C5 Admissions
☐ Enquiry → contacted → visit → form → admitted pipeline, each transition with actor and timestamp.
☐ Deduplication on name + DOB + parent phone.
☐ Public admission form works unauthenticated, is rate-limited and is captcha-protected.
☐ Document upload, verification, missing-document reminder.
☐ Entrance test scheduling and merit list.
☐ Offer letter expires after 14 days and auto-promotes the next waitlisted candidate.
☐ **Capacity is not double-allocated under concurrent payments** (Plan.docx §10 acceptance criterion).
☐ Payment success converts enquiry → Student + Enrolment **with no re-typing**, in one transaction.
☐ Parent account is auto-created and linked; welcome kit is sent.
☐ RTE track: income/caste verification, quota counter, fee exemption.

### C6 Fees & Accounting
☐ All four fee shapes (D10): annual+installments, per-batch, monthly recurring, ad-hoc.
☐ Component-wise structure with GST per head; **tuition exempt**, transport/hostel/mess taxable.
☐ Sibling discount auto-applies; staff-ward, merit, need-based, RTE concessions work.
☐ Demand generation is **idempotent** — running twice does not duplicate demands.
☐ Collection: cash, cheque, DD, NEFT, UPI, card, net banking.
☐ Online payment: order creation, webhook **HMAC verification**, duplicate webhook ignored.
☐ Partial payment allocates across components in order; balance is exact.
☐ Late fee accrues per policy with auto-waiver rules.
☐ Cheque bounce reverses the allocation and re-opens the demand.
☐ Refund requires Accountant + Principal sign-off and traces to the original payment.
☐ Receipt PDF carries logo, GST, ₹ formatting; reprint is byte-identical.
☐ Day book, collection register, defaulter list, component-wise income, GSTR-1/3B extract.
☐ **Bank reconciliation matches the gateway settlement to the rupee** (Plan.docx Appendix E).
☐ Ledger is append-only; corrections are reversal entries.
☐ All amounts are integer paise; no float appears in any stored value.

### C7 Attendance
☐ Daily and period-wise marking; 40 students in under 30 seconds on mobile.
☐ All sources ingest: manual, biometric, RFID, QR, face — with 5-minute deduplication.
☐ Approved leave auto-marks `Leave`, not `Absent`; holidays suppress absence notifications.
☐ Absence SMS to the parent within 30 minutes of school start.
☐ Long-absence alerts at 3 / 7 / 15 days.
☐ Edits after T+24h require a Principal override and are audited.
☐ Staff attendance with geo-fencing, late-mark grace, and LOP linkage to payroll.
☐ Monthly attendance percentage feeds the report card.

### C8 Communication
☐ SMS, WhatsApp, email and push all dispatch and record delivery status.
☐ Template registry with DLT ids; un-registered templates are rejected.
☐ Bulk send to a class/section/all-parents/all-staff requires **Principal approval and a preview**.
☐ Quiet hours and per-recipient throttle enforced; critical alerts bypass both.
☐ Parent-teacher chat with office hours and full archival.
☐ Notices with acknowledgement tracking and regional-language delivery.
☐ Opt-out honoured for non-transactional messages.

### C9 Timetable
☐ Period configuration including half-days, Saturdays and exam days.
☐ Manual grid editing with **conflict detection** (teacher double-booking, lab clash).
☐ Auto-generation honours max periods/day, periods/week, no back-to-back, lab availability.
☐ Substitution suggests free teachers and notifies the substitute.
☐ Exam date sheet with the no-two-papers-same-day check, rooms, invigilators and seating.
☐ Faculty diary: per-period plan, taught/pending/postponed, HoD review.

### C10 Exams & Results
☐ All exam types; grading engine pluggable (CBSE A1–E, ICSE, State, CCE).
☐ Marks entry via UI and CSV; max-marks validation; **lock after verification** (A6).
☐ Results cannot publish until every subject has marks for every enrolled student.
☐ Principal approval gate before publication.
☐ Report card: template per board, co-scholastic, attendance %, remarks, rank (toggleable), digital signature.
☐ Bulk PDF generation meets <100 ms per card (Plan.docx §14).
☐ Revaluation creates a **versioned** mark record; the original is retained.
☐ Grace marks are Principal-only and reasoned.
☐ **No published result can be silently mutated.**

### C11 HR & Payroll
☐ Staff records with documents and expiry alerts (police verification, licence).
☐ Leave types, balances, accrual, carry-forward, encashment; multi-level approval.
☐ Salary structure; PF, ESIC, PT, TDS, LOP, loan EMI computed correctly.
☐ **Maker ≠ checker ≠ approver** enforced on the payroll run.
☐ Payslip PDF; Form 16; bank NEFT file with dual authorisation and encryption.
☐ Payroll for 200 employees completes in under 30 seconds (Plan.docx §15).
☐ Post-approval revision creates a fresh cycle with a reason, never an in-place edit.

### C12 Library
☐ Catalogue with ISBN, copies, barcode/QR; issue and return in under 3 seconds by scan.
☐ Borrowing limits per member type; renewal cap; reservation queue.
☐ Fine auto-calculation; issue blocked on overdue or unpaid fines.
☐ Lost/damaged billing; stock audit reconciles to 100%.
☐ Library dues participate in the TC no-dues check.

### C13 Transport
☐ Vehicles with RC, insurance, PUC, fitness; **a vehicle with an expired document cannot start a route**.
☐ Routes, stops, sequence, timings; student allocation with capacity enforcement.
☐ Transport fee auto-calculated by route/distance with GST.
☐ GPS ingestion; live map updates within 5 seconds; device-offline alert after 60 s.
☐ Boarding scan → parent notification on board and alight.
☐ Driver SOS reaches the Transport Manager and Principal.
☐ Fuel and maintenance logs.

### C14 Hostel & Meals
☐ Blocks, floors, rooms, bed types; allocation with waiting list and roommate preference.
☐ Morning and night roll call.
☐ Leave/gate pass with **parent OTP approval**.
☐ Mess menu with dietary restrictions (Jain, vegan, allergy); mess attendance.
☐ Hostel, mess, laundry and electricity fees.
☐ Warden duty roster and incident log.

### C15 Front Office & Certificates
☐ Visitor entry with photo and ID; gate pass with QR.
☐ Pre-approved pickup list; **OTP-based student dispatch when an unlisted person arrives** — a child-safety control.
☐ Phone log, courier register, lost and found.
☐ TC: no-dues chain across fees, library and inventory → Principal sign-off → serial number → TC register.
☐ **TC is blocked when dues are pending**, and the parent is told the amount.
☐ Bonafide, character, conduct, migration, participation, merit certificates.
☐ Public QR verification page validates a certificate without a login.
☐ TC register is immutable.

### C16 Inventory & Expenses
☐ Indent → stock check → issue, or PO → approval → GRN → stock update.
☐ Vendor master, GST invoices, asset register with serial numbers.
☐ Re-order and expiry alerts.
☐ Expense voucher with bill upload and GST input credit.
☐ Multi-level approval with the ₹ thresholds from RBAC Appendix B; petty cash under ₹5,000 needs no workflow.
☐ Monthly and annual expense reports; P&L view for the Trustee.

### C17 Discipline, Health & Counselling
☐ Merit/demerit points; incident log; suspension workflow with letter.
☐ **POSH: anonymous reporting; ICC-members-only access; unmasking is the ICC Chair alone and cannot be delegated.**
☐ Counsellor notes are private — **verify a Class Teacher and a Principal cannot read them**.
☐ Medical check-up, BMI, vision, dental; vaccination records.
☐ Clinic visit log; allergy and chronic-condition flags surface where a teacher needs them.
☐ Health data is invisible to finance and academic roles.

### C18 Events, Alumni & Tasks
☐ Event creation, online registration, paid events with e-tickets, participation certificates.
☐ Photo gallery with **per-student consent flags and face-blur controls**; public publish needs Principal approval.
☐ Alumni directory by batch, donations, mentorship matching.
☐ Tasks with recurrence, comments, progress and a workload-per-staff view.

### C19 Reports & Analytics
☐ Every standard report from specification §30.2 runs and exports to Excel, PDF and CSV.
☐ Scheduled reports deliver by email/WhatsApp on schedule.
☐ **Bulk export over 500 records is restricted to Principal/Compliance Officer and the link expires in 4 hours** (RBAC §6.4).
☐ Role dashboards each load real data.
☐ RTE quota report is accurate.
☐ Every report respects scope — an exported report must not contain a row the user cannot see in the UI.

### C20 Super Admin & Billing
☐ Provision, suspend and archive tenants; a tenant with outstanding invoices cannot be deleted.
☐ Plan builder, module toggles, feature overrides.
☐ Monthly billing run; proration; dunning at D+3/D+7/D+14; soft-suspend at D+21.
☐ Billing for 1,000 tenants completes in under 10 minutes (Plan.docx §8).
☐ Platform health, API logs, background job monitor, security centre.
☐ **Super Admin cannot read student PII by default** (RBAC §2.1) — verify the block, and verify that
&nbsp;&nbsp;granted support access is time-boxed and audited.

---

## Part D — Golden journeys

Full cross-module runs, executed by a second person, in the browser, against a fresh seed.
These are the Playwright suite once the harness exists.

### D1 — Enquiry to enrolled student to first fee paid *(spec Appendix F.1)*
☐ Receptionist logs a phone enquiry → auto-assigned to a counsellor
☐ Parent submits the public form and uploads documents
☐ Admission Officer verifies; flags a missing TC; parent uploads it
☐ Principal approves → offer issued with a fee invoice
☐ Parent pays online → webhook captured → receipt issued
☐ Student + Enrolment created; class and roll allocated; parent account linked
☐ Welcome kit and credentials sent
☐ Class Teacher sees the new student on the roster
☐ First monthly demand generates on schedule and is payable in-app
☐ **Every state transition has an actor and a timestamp in the audit log**

### D2 — A day in a teacher's life *(spec Appendix F.2)*
☐ Login → Today view with periods and pending tasks
☐ Mark attendance for 40 students in under 30 seconds
☐ Absent students' parents receive SMS within 30 minutes
☐ Post homework with an attachment → students and parents notified
☐ Enter term marks → submit for approval
☐ Reply to a parent message

### D3 — Full exam cycle *(spec Appendix F.3)*
☐ Create exam → map subjects → build date sheet → publish → hall tickets
☐ Teachers enter marks (UI + CSV) → sanity report shows no missing marks
☐ HoD verifies → Exam Coordinator locks → Principal publishes
☐ Report cards generate and deliver to parents
☐ A parent raises revaluation → correction workflow → versioned record → parent notified

### D4 — Fee cycle with concession and default
☐ Generate term demands for a class
☐ Class Teacher requests a concession → Accountant verifies → Principal approves → revised schedule
☐ Reminders fire at D-7, due date, D+3, D+7
☐ A defaulter appears in the list and is blocked from TC issuance
☐ Day book reconciles with the gateway settlement

### D5 — Multi-branch trustee day
☐ Trustee sees consolidated figures across both branches
☐ Drills into one branch; the other's data is absent
☐ Approves a waiver above the Principal's threshold
☐ **Every cross-branch access appears in the audit log** (RBAC §6.4)

### D6 — Parent journey (Flutter)
☐ Phone-OTP login → Today card shows attendance, homework, fee due, latest notice
☐ Switch between two children in different branches
☐ Pay a fee in two taps; receipt arrives
☐ Track the bus live; receive the approaching-stop alert
☐ Apply for leave; chat with the class teacher
☐ Download the report card

### D7 — Coaching centre journey
☐ Tenant created with `institutionType: coaching`
☐ Course and batches created; UI reads Course/Batch, never Class/Section
☐ Student enrolled into a batch mid-month
☐ **Fee prorated from the join date**
☐ Batch attendance and batch test marks recorded
☐ No TC option is offered anywhere

---

## Part E — Non-functional verification

Targets from Plan.docx Appendix E.

| Attribute | Target | ☐ |
|---|---|---|
| API latency p95 | <400 ms read, <800 ms write | ☐ |
| Login latency p95 | <400 ms | ☐ |
| Concurrent users per tenant | 5,000 sustained, 15,000 peak | ☐ |
| Bulk import | 10,000 rows in <60 s | ☐ |
| Report card generation | <100 ms per card, parallelised | ☐ |
| Payroll | 200 employees in <30 s | ☐ |
| Billing run | 1,000 tenants in <10 min | ☐ |
| Availability | 99.9% monthly | ☐ |
| Backup RPO / RTO | 15 min / 1 h, verified by a **restore drill** | ☐ |
| Accessibility | WCAG 2.1 AA | ☐ |
| Browsers | Last 2 of Chrome, Firefox, Safari, Edge | ☐ |
| Mobile OS | Android 9+, iOS 13+ | ☐ |
| Mobile cold start | <2 s on mid-tier Android | ☐ |
| Localisation | English + Hindi + Gujarati complete, no untranslated strings | ☐ |
| Data residency | Indian region confirmed | ☐ |

**Security verification**
☐ OWASP Top 10 review
☐ Dependency scan clean (no high/critical)
☐ No secret in the repository or in any log
☐ Rate limits verified on `/auth/*` and on bulk endpoints
☐ File upload: type allow-list, size cap, malicious-file rejection
☐ Signed URLs expire correctly
☐ Penetration test before go-live

---

## Sign-off register

A module ships only with two signatures. The implementer cannot be the verifier.

| Module | Part A | Part B | Part C | Implementer | Verifier | Date | Status |
|---|:--:|:--:|:--:|---|---|---|---|
| Platform foundation | ☐ | ☐ | — | | | | |
| Tenant & Onboarding | ☐ | ☐ | ☐ C1 | | | | |
| Identity & RBAC | ☐ | ☐ | ☐ C2 | | | | |
| Academic Structure | ☐ | ☐ | ☐ C3 | | | | |
| Students | ☐ | ☐ | ☐ C4 | | | | |
| Admissions | ☐ | ☐ | ☐ C5 | | | | |
| Fees & Accounting | ☐ | ☐ | ☐ C6 | | | | |
| Attendance | ☐ | ☐ | ☐ C7 | | | | |
| Communication | ☐ | ☐ | ☐ C8 | | | | |
| Timetable | ☐ | ☐ | ☐ C9 | | | | |
| Exams & Results | ☐ | ☐ | ☐ C10 | | | | |
| HR & Payroll | ☐ | ☐ | ☐ C11 | | | | |
| Library | ☐ | ☐ | ☐ C12 | | | | |
| Transport | ☐ | ☐ | ☐ C13 | | | | |
| Hostel & Meals | ☐ | ☐ | ☐ C14 | | | | |
| Front Office & Certificates | ☐ | ☐ | ☐ C15 | | | | |
| Inventory & Expenses | ☐ | ☐ | ☐ C16 | | | | |
| Discipline, Health, Counselling | ☐ | ☐ | ☐ C17 | | | | |
| Events, Alumni, Tasks | ☐ | ☐ | ☐ C18 | | | | |
| Reports & Analytics | ☐ | ☐ | ☐ C19 | | | | |
| Super Admin & Billing | ☐ | ☐ | ☐ C20 | | | | |
| Golden journeys (Part D) | — | — | ☐ | | | | |
| Non-functional (Part E) | — | — | ☐ | | | | |

### Go-live gate

Release is blocked until **all** of the following are true:

☐ Part A fully green — every known defect has a passing regression test
☐ Part B fully green on every shipped module
☐ Part C green for every shipped module, signed by a second person
☐ Golden journeys D1, D2, D4 pass (the three revenue-critical paths)
☐ Restore drill completed successfully
☐ Penetration test complete, no high or critical findings open
☐ Runbooks written for the top 10 incidents
☐ DPA and SLA signed with the first customer
☐ Data residency confirmed
☐ Status page live and on-call rota published
