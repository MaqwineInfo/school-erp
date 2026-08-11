---
name: feature-e2e-verification
description: Manually verify a School ERP feature end-to-end after implementation — backend, RBAC enforcement, frontend, and alignment with the functional spec — since this repo has no automated test suite. Use when a feature/change is implemented and needs checking before considering it done, or when the user asks to verify, test, or confirm a feature works.
---

# Feature E2E Verification

Read `/CLAUDE.md` first if you haven't this session. **There is no `npm test` in this repo** — no Jest/Vitest/Mocha, no test files. This checklist is the substitute quality gate. Actually run the checks (start dev servers, hit real endpoints, click through the UI) — don't just read the code and assume it works.

## Setup

```
cd backend && npm run dev     # http://localhost:5000
cd frontend && npm run dev    # http://localhost:3000, proxies /api -> :5000
```
Seed data if needed: `npm run seed` or `npm run seed:full` in `backend/`. Log in as a role relevant to the feature (check seeded users, e.g. `SUPER_ADMIN_EMAIL`/`SUPER_ADMIN_PASSWORD` from `.env`, or portal users from `seed-portal-users.js`).

## A. Backend

- [ ] Route is reachable at the expected `/api/v1/...` path and returns the `shared/response.js` shape (`{ success: true, data, ... }` / `{ success: false, error: {...} }`).
- [ ] `zod` validation actually rejects bad input (missing required field, wrong type) with a 400 and a useful message — don't just check the happy path.
- [ ] Tenant/branch scoping is applied: data from a different `tenantId` (or, for non-`all_branches` roles, a different `branchId`) is not visible or editable. `applyBranchScope`/`req.branchFilter` (or `req.rbacScope`) should be used in the controller's query, not skipped.
- [ ] Mongoose model fields save/round-trip correctly (check via the DB or a GET after a POST/PUT).
- [ ] If the endpoint is a payment/admission-type endpoint, confirm idempotency-key handling behaves (repeat request doesn't double-create).

## B. RBAC

- [ ] The `Permission` record(s) for the intended role(s)/module/action exist (check via `/api/v1/roles` or the DB) — if this feature added a new module or action, confirm `seed-permissions.js` was actually run, not just edited.
- [ ] Log in (or simulate) as a role that should be **denied** — confirm you get a 403 from the backend (`checkPermission` in `middleware/rbac.js`) and the frontend correctly hides/redirects (via `ModuleRoute`, `can()`/`hasModule()`) rather than showing a broken UI.
- [ ] Log in as a role that should be **allowed** but with a narrower scope (e.g. `own_branch` vs `all_branches`) and confirm they only see their own data.
- [ ] If the action is sensitive (Fees/Payroll/Marks/Certificates/Role Management/Audit Logs/Settings) or wrapped in `audit(...)`, confirm an `AuditLog` row is actually written after the action (check `/api/v1/audit-logs` or the DB) with the right `module`/`action`/`userId`.
- [ ] If this is an approval-workflow feature, confirm the request→approve/reject cycle matches the RBAC doc's Section 5 pattern for that workflow type.

## C. Frontend

- [ ] Page renders without console errors for an allowed role.
- [ ] Form validation matches the backend's `zod` schema (same required fields, same error surfaced to the user) — a mismatch here means a user sees a generic 400 instead of a helpful inline error.
- [ ] All data access goes through the service layer (`services/*.service.ts` → `lib/api.ts`), not ad-hoc `fetch`/`axios` — check no `401` redirect loop or missing `Authorization` header issues.
- [ ] Nav entry in `portalNav.tsx` shows only for the intended portal(s)/role(s), and disappears correctly for a role/module that shouldn't see it (`hasModule`/`can` both matter — tenant-plan-gating vs RBAC are separate checks, verify both).
- [ ] Loading and error states are handled (not just the happy path) — check a slow/failed request doesn't leave a blank or stuck UI.

## D. Cross-cutting

- [ ] Behavior matches the relevant section of `Enterprise_School_ERP_Indian_Specification_v2.md` — re-read it and confirm nothing was missed or contradicted.
- [ ] If a `docs/workflows/*.md` doc covers this flow, confirm actual behavior still matches it; update the doc if the implementation diverged intentionally.
- [ ] If the brief from `feature-brainstorming`/`feature-implementation-plan` flagged open questions, confirm they were actually resolved (not silently dropped).

## Reporting

Summarize as a pass/fail list against the checklist above, not just "looks good" — call out anything skipped (e.g. "didn't test as a denied role") so the user knows the actual coverage of the check.
