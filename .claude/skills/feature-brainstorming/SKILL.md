---
name: feature-brainstorming
description: Scope and shape a new or changed School ERP feature before any code is written — grounds the idea in the Indian functional spec, the RBAC role/module model, and this codebase's existing modules so proposals extend the system instead of duplicating or conflicting with it. Use when the user wants to brainstorm, scope, or ideate a feature, or asks "should we add X" / "how should X work".
---

# Feature Brainstorming

Read `/CLAUDE.md` first if you haven't this session — it maps which source doc answers which kind of question.

Goal: turn a vague feature idea into a short, concrete **brief** that `feature-implementation-plan` can pick up directly. Don't write code in this skill.

## Process

1. **Pin down who this is for.** Identify the target role(s) using the real role list from `RBAC_Permission_Architecture_Plan.md` Section 1 (e.g. "Class Teacher", "Accountant", "Parent") — never invent a role name. If the user's phrasing doesn't map cleanly to an existing role, ask which one(s) they mean.

2. **Check what's already specified.** Search `Enterprise_School_ERP_Indian_Specification_v2.md` for the relevant section(s) (it has 38, one per module area — Admission, Attendance, Fee Management, Examination, etc.). If the feature is already described there, use that as the baseline and brainstorm only the gap between spec and reality. If it's genuinely new, say so explicitly — don't silently invent scope that contradicts the spec.

3. **Check what already exists in code**, to extend rather than duplicate:
   - `backend/src/routes/` + `src/models/` — is there already a module this belongs in (e.g. a "fee reminder" feature likely belongs under `fee.routes.js`/`FeeDemand`/`FeePayment`, not a new top-level module)?
   - `frontend/src/pages/<module>/` — is there an existing page this is a variant/addition of?
   - `frontend/src/config/portalNav.tsx` and `moduleAliases.ts` — is there already a `module` key this should reuse?

4. **Surface 2–3 concrete options** when there's a real design choice (e.g. "a new field on the existing Fee Concession approval flow" vs "a standalone concession-request module"), with a one-line trade-off each. Skip this step if there's an obvious single approach.

5. **Produce the brief.** Keep it short — this is scoping, not a spec document:
   - **Problem** — one or two sentences, what breaks/is-missing today.
   - **Target roles & scope** — which roles, and their `branchScope`/`dataScope`/`studentScope` per the RBAC model (e.g. "Class Teacher, own_branch + own division").
   - **Placement** — which existing backend route/model/frontend page this extends, or, if genuinely new, the proposed module name (check it doesn't collide with an existing one in `moduleAliases.ts`).
   - **Data touched** — which Mongoose model(s) gain fields, or what a new model looks like at a high level (not a full schema).
   - **Sensitive?** — flag if it touches Fees/Payroll/Marks/Certificates (destructive-action = most-restrictive-role-wins per the RBAC doc) or needs an approval workflow (RBAC doc Section 5).
   - **Open questions** — anything you couldn't resolve from the docs/code; ask the user before handing off.

6. End by offering to hand off to `feature-implementation-plan` with this brief once the user confirms it looks right.
