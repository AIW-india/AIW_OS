# AIW OS --- Implementation Roadmap and Engineering Handoff

**Document ID:** AIW-OS-ROADMAP-001 \| **Version:** 0.1 \| **Status:**
Draft delivery plan \| **Date:** 25 November 2026

## 1. Delivery principles

-   Build working vertical slices, not all screens before backend or
    vice versa.
-   Keep the modular monolith boundaries.
-   Deliver tenant isolation and RBAC before business data modules.
-   Use migrations, automated tests, code review, and staging from the
    beginning.
-   Do not allow two coding agents to edit the same files concurrently.
-   Antigravity is the primary implementation environment; Claude Code
    can review architecture, security, complex changes, and test gaps. A
    single agent/branch owns a given active change.
-   Do not integrate Odoo stock mutations or biometric face verification
    before their design decisions are approved.

## 2. Repository and engineering foundation

Suggested monorepo:

``` text
aiw-os/
  apps/
    web/
    api/
    worker/              # only when background jobs are introduced
  packages/
    shared-types/
    validation/
    api-client/
  docs/
    product/
    architecture/
    security/
    testing/
  infra/
    docker/
    deployment/
  .github/workflows/
```

Set up: - TypeScript strict mode. - Lint/format conventions. -
Environment variable validation. - Central error handling and request
IDs. - Database migration workflow. - Test framework and fixtures. - CI
checks and protected main branch. - Secret scanning and dependency
scanning. - Development/staging/production configuration separation.

## 3. Delivery phases and gates

### Phase 0 --- Foundation

Deliver: repository, frontend shell, API shell, PostgreSQL, Prisma
migrations, authentication, tenant context, RBAC, audit events, CI,
staging deployment.

Gate: cross-tenant tests pass; custom role and Super Admin behaviour
works; no unauthorised API access.

### Phase 1 --- Organisation and CRM

Deliver: user lifecycle, departments/designations, roles, permissions,
invitations, customers, leads, interactions, follow-ups, dashboard
shell.

Gate: dynamic workforce administration tested beyond current snapshot;
role-scoped CRM access works.

### Phase 2 --- Estimation and project initiation

Deliver: rate library, BOQ/estimate, quotation versions, owner approval,
PDF/export, customer acceptance, project creation, project membership,
milestones/tasks.

Gate: no unapproved quotation dispatch; version history and financial
arithmetic verified.

### Phase 3 --- Design and site operations

Deliver: document storage, design packages/revisions/approvals, task
templates, DPR, site photo uploads, quality inspections.

Gate: only approved design version can be used for execution;
project/site scope verified.

### Phase 4 --- Workforce and attendance

Deliver: workforce profiles, attendance check-in/out, own history,
attendance-only worker UI, correction requests, supervisor review.

Gate: backend allowlist tests pass; privacy notice/fallback/retention
decisions documented. Face verification only if separately approved.

### Phase 5 --- Procurement and finance

Deliver: vendors, material requests, vendor comparison, approval rules,
PO, receipt verification, expenses, client receipts, vendor payables,
project financial summary.

Gate: approval thresholds confirmed; accountant validates financial
definitions; inventory source of truth decided before stock movements.

### Phase 6 --- Integrations and scale

Deliver: email, in-app notifications, WhatsApp Business Platform, Odoo
adapter if approved, advanced reports, monitoring improvements, load
tests.

Gate: integration retries/idempotency/reconciliation tested; vendor
security review complete.

### Phase 7 --- Mobile and AI enhancements

Deliver: native mobile app if justified; AI-assisted document/BOQ
extraction, enquiry triage, DPR summaries, and reporting.

Gate: human review required for outputs affecting commercial or
operational commitments.

## 4. Definition of done

A feature is complete only when: - Requirements and permissions are
documented. - Backend validation and authorisation exist. - Tenant and
project scope are enforced. - UI loading/empty/error/success states
exist. - Audit requirements are implemented. - Unit, integration, API,
and relevant E2E tests pass. - Accessibility and responsive behaviour
are checked. - Logs and monitoring are adequate. - Documentation and
migration notes are updated. - Staging acceptance is complete.

## 5. Release management

-   Feature branches and pull requests.
-   No direct unreviewed production changes.
-   CI must pass before merge.
-   Database migrations reviewed and tested.
-   Staging smoke/UAT before production.
-   Release notes, backup verification, and rollback plan required.
-   Prefer backward-compatible migrations and phased feature flags.

## 6. Agent workflow

1.  Assign one bounded task and identify the source documents.
2.  Agent inspects current code and reports a short plan.
3.  Implement one vertical slice.
4.  Run tests, lint, typecheck, and build.
5.  Review diff for unrelated changes, security, tenant scope, and
    regressions.
6.  Commit with descriptive message.
7.  Update relevant docs.
8.  Only then begin the next dependent task.

Never ask multiple agents to modify the same module or schema
simultaneously. Use Claude Code as reviewer when Antigravity owns
implementation, not as a parallel editor of the same files.

## 7. Initial backlog

1.  Confirm auth/session provider.
2.  Scaffold monorepo and CI.
3.  Implement tenant-aware schema and migration strategy.
4.  Implement user lifecycle, dynamic departments/designations, roles
    and permissions.
5.  Implement audit log and test matrix.
6.  Build responsive app shell and role-aware navigation.
7.  Implement CRM vertical slice.
8.  Implement estimate/quotation approval vertical slice.
9.  Continue by dependency order in the phases above.

## 8. Explicitly deferred decisions

Do not invent purchase thresholds, payroll rules, biometric provider,
Odoo stock authority, tax treatment, or SaaS subscription rules.
Represent them as configurable policy or TBD until the business confirms
them.
