---
name: feature-implementation-plan
description: Turn an already-scoped School ERP feature (e.g. from feature-brainstorming, or described directly by the user) into a concrete backend + frontend implementation plan that follows this repo's existing conventions (route/controller/model layering, RBAC wiring, service/page structure). Use when the user has a clear feature in mind and wants a build plan, not more brainstorming.
---

# Feature Implementation Plan

Read `/CLAUDE.md` first if you haven't this session, especially the "Repo layout" and "Auth & RBAC model" sections — this skill assumes those conventions.

Goal: produce a concrete, ordered implementation plan for one feature, tight enough to hand straight to plan-mode/ExitPlanMode or to execute directly. Don't skip steps just because they seem obvious — the RBAC and audit wiring in particular is easy to forget and this codebase enforces it strictly.

## Process

### 1. Backend

- **Model**: which `backend/src/models/*.js` gains fields, or (if new) sketch the Mongoose schema — remember every tenant-scoped collection needs `tenantId` (and usually `branchId`); there is no migrations system, so schema changes just are the schema, plus a note if `src/scripts/seed*.js` needs updating for demo/dev data.
- **Controller**: which `backend/src/controllers/*.controller.js` gains a handler, or a new one following the existing per-domain naming. Validate input with `zod`. Use `shared/response.js` (`sendSuccess`/`sendCreated`/`sendError`) for responses and `shared/errors.js` classes for error paths — never hand-roll `res.status().json()`.
- **Route**: add to the relevant `backend/src/routes/*.routes.js` (register new route files in `routes/index.js`). Follow the existing pipeline: `router.use(authenticate, applyBranchScope)` then per-route `checkPermission(module, action)`. Pick the right `module` key — reuse an existing one from `moduleAliases.ts`/`Permission` records unless this is genuinely a new module.
- **RBAC data**: does `Permission` need new rows (new module, or new action on an existing module) for the roles from the brief? Note which roles get which actions — this typically means updating `src/scripts/seed-permissions.js` and re-running it, not just writing code.
- **Audit**: if the module is Fees/Payroll/Marks/Certificates/Role Management/Audit Logs/Settings (or otherwise sensitive per RBAC doc Section 5/6), wrap the mutating route with `audit(module, action)`. Check `CRITICAL_ACTIONS` in `middleware/rbac.js` — add the action there if it should be tagged `severity: 'critical'`.
- **Approval workflow?** If this feature needs sign-off (concession, leave, payroll release, etc.), check whether it fits the existing `ApprovalRequest` model / `/approvals` route rather than inventing a parallel mechanism.

### 2. Frontend

- **Service**: add/extend `frontend/src/services/<module>.service.ts`, using `get/post/put/patch/del` from `lib/api.ts` — never call `axios` directly from a service or component.
- **Types**: extend `frontend/src/types/` for any new/changed shape.
- **Page**: add to the matching `frontend/src/pages/<module>/` folder, following the existing page's data-fetching pattern (`@tanstack/react-query` for server state, `react-hook-form` + `zod` for forms, matching the backend's zod schema).
- **Route + guard**: register the page in `App.tsx` wrapped in `<ModuleRoute module="..." action="...">` (matching the backend `checkPermission` call), not just `<RequireAuth>` alone.
- **Nav**: add an entry to the relevant portal array(s) in `portalNav.tsx` (`module`/`action` fields drive visibility automatically via `auth.store.ts#can()`/`hasModule()`) — check which portals (Parent/Student/Teacher/Admin/...) should actually see this.
- **Module gating**: if this is a new module, add it to `TENANT_MODULE_ALIASES` in `config/moduleAliases.ts` so tenant-plan gating (`enabledModules`) works.

### 3. Contract & docs

- Does `docs/architecture/openapi.yaml` need a new/updated path or schema? Note the addition even if you don't hand-author YAML in this plan step.
- Does this change or extend a documented flow in `docs/workflows/*.md` (admission/attendance/fee-collection)? If yes, flag the doc as needing an update; if the feature introduces a comparably complex new flow, consider whether a new workflow doc is warranted.

### 4. Output

Present the plan as an ordered list of concrete file-level changes (backend model → controller → route → permission seed → audit, then frontend service → types → page → route guard → nav), each with the specific file path. Call out any open decisions the brainstorming brief left unresolved. End by pointing to `feature-e2e-verification` for after implementation.
