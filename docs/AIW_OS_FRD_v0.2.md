# AIW OS --- Functional Requirements Document

**Document ID:** AIW-OS-FRD-001 \| **Version:** 0.2 \| **Status:** Draft
baseline \| **Date:** 25 November 2026

## 1. Purpose and conventions

This document defines observable functional behaviour. Priority: **P0**
launch-critical, **P1** important, **P2** later enhancement. All
requirements are tenant-scoped unless explicitly stated otherwise.

## 2. Global requirements

  -----------------------------------------------------------------------
  ID                      Priority                Requirement
  ----------------------- ----------------------- -----------------------
  FR-GEN-001              P0                      Every tenant-owned
                                                  record shall be
                                                  associated with an
                                                  organisation
                                                  identifier.

  FR-GEN-002              P0                      The server shall derive
                                                  tenant context from
                                                  authenticated identity,
                                                  not trust arbitrary
                                                  client tenant IDs.

  FR-GEN-003              P0                      The server shall
                                                  enforce permission and
                                                  record-scope checks on
                                                  every protected
                                                  operation.

  FR-GEN-004              P0                      The system shall
                                                  support configurable
                                                  users, departments,
                                                  designations, roles,
                                                  permissions, and
                                                  project assignments
                                                  without code changes.

  FR-GEN-005              P0                      The current workforce
                                                  count shall not be
                                                  hardcoded as a limit.

  FR-GEN-006              P0                      Each tenant shall
                                                  support an Organisation
                                                  Super Admin role for
                                                  organisation-wide
                                                  administration.

  FR-GEN-007              P0                      Administrative
                                                  permissions shall not
                                                  automatically grant
                                                  business approval
                                                  authority.

  FR-GEN-008              P0                      Workers and contractors
                                                  shall be restricted to
                                                  attendance-only
                                                  functionality and their
                                                  own attendance records.

  FR-GEN-009              P0                      Deactivated users shall
                                                  lose access while
                                                  historical records and
                                                  attribution remain.

  FR-GEN-010              P0                      Sensitive changes and
                                                  approvals shall be
                                                  auditable.

  FR-GEN-011              P0                      The application shall
                                                  provide responsive
                                                  experiences for
                                                  desktop, tablet, and
                                                  mobile browsers.

  FR-GEN-012              P0                      Financial amounts shall
                                                  use fixed-precision
                                                  decimal storage.
  -----------------------------------------------------------------------

## 3. Organisation, users and RBAC

  -----------------------------------------------------------------------
  ID                      Priority                Requirement
  ----------------------- ----------------------- -----------------------
  FR-ORG-001              P0                      Super Admin can
                                                  invite/create users and
                                                  update profile fields.

  FR-ORG-002              P0                      Super Admin can
                                                  activate, suspend,
                                                  deactivate, and
                                                  reactivate users.

  FR-ORG-003              P0                      Deactivation revokes
                                                  active sessions/tokens
                                                  and blocks API access.

  FR-ORG-004              P0                      Super Admin can create,
                                                  edit, archive
                                                  departments and
                                                  designations.

  FR-ORG-005              P0                      Super Admin can create
                                                  custom roles and assign
                                                  granular permissions.

  FR-ORG-006              P0                      Users can have one or
                                                  more roles subject to
                                                  policy.

  FR-ORG-007              P0                      Project membership
                                                  controls project-scoped
                                                  access.

  FR-ORG-008              P0                      The system records
                                                  actor, target,
                                                  timestamp, and
                                                  before/after values for
                                                  role and access
                                                  changes.

  FR-ORG-009              P1                      The system supports
                                                  scheduled role
                                                  delegation with
                                                  effective dates.

  FR-ORG-010              P1                      The SaaS design
                                                  separates Platform
                                                  Super Admin from tenant
                                                  Organisation Super
                                                  Admin.
  -----------------------------------------------------------------------

## 4. CRM

  -----------------------------------------------------------------------
  ID                      Priority                Requirement
  ----------------------- ----------------------- -----------------------
  FR-CRM-001              P0                      Users with permission
                                                  can create and update
                                                  enquiries with contact,
                                                  source, location,
                                                  property, service,
                                                  budget, requirements,
                                                  and timeline.

  FR-CRM-002              P0                      Leads have configurable
                                                  stages and controlled
                                                  stage transitions.

  FR-CRM-003              P0                      Users can assign lead
                                                  owners and follow-up
                                                  dates.

  FR-CRM-004              P0                      The system records
                                                  interactions, notes,
                                                  attachments, and next
                                                  actions.

  FR-CRM-005              P1                      Lost leads capture a
                                                  configurable lost
                                                  reason.

  FR-CRM-006              P0                      A won lead can be
                                                  converted without
                                                  duplicate customer
                                                  entry.
  -----------------------------------------------------------------------

## 5. Estimation, BOQ and quotations

  -----------------------------------------------------------------------
  ID                      Priority                Requirement
  ----------------------- ----------------------- -----------------------
  FR-EST-001              P0                      Users can create
                                                  estimates containing
                                                  line items, units,
                                                  quantities, rates,
                                                  labour/material
                                                  classification,
                                                  wastage, tax, and
                                                  totals.

  FR-EST-002              P0                      The system calculates
                                                  line and document
                                                  totals using
                                                  decimal-safe
                                                  arithmetic.

  FR-EST-003              P1                      Users can maintain
                                                  reusable standard rates
                                                  and project-specific
                                                  rate overrides.

  FR-EST-004              P1                      Users can import/export
                                                  BOQ spreadsheets.

  FR-QUO-001              P0                      The system creates
                                                  numbered quotation
                                                  revisions linked to an
                                                  estimate/customer.

  FR-QUO-002              P0                      Official dispatch is
                                                  blocked until an
                                                  authorised
                                                  owner/management
                                                  approver approves the
                                                  exact version.

  FR-QUO-003              P0                      A material edit to an
                                                  approved quotation
                                                  creates a new revision
                                                  and invalidates prior
                                                  approval for dispatch
                                                  of the new revision.

  FR-QUO-004              P0                      The system stores
                                                  approval actor,
                                                  timestamp, decision,
                                                  comments, and version
                                                  reference.

  FR-QUO-005              P1                      Approved quotation can
                                                  be exported to PDF.
  -----------------------------------------------------------------------

## 6. Projects, tasks and design

  --------------------------------------------------------------------------
  ID                      Priority                Requirement
  ----------------------- ----------------------- --------------------------
  FR-PRJ-001              P0                      An accepted quotation can
                                                  be converted to a project
                                                  while preserving the
                                                  source version.

  FR-PRJ-002              P0                      A project supports
                                                  category, status,
                                                  customer, site, manager,
                                                  dates, budget references,
                                                  and membership.

  FR-PRJ-003              P0                      Users can create tasks
                                                  with assignee, due date,
                                                  priority, dependencies,
                                                  status, comments, and
                                                  evidence.

  FR-PRJ-004              P1                      Reusable project task
                                                  templates can be
                                                  configured by project
                                                  type.

  FR-PRJ-005              P0                      Users can submit versioned
                                                  design packages for
                                                  review.

  FR-PRJ-006              P0                      Design approval supports
                                                  internal owner approval
                                                  and subsequent client
                                                  approval.

  FR-PRJ-007              P0                      Only the current
                                                  client-approved design
                                                  version can be marked
                                                  execution-authoritative.

  FR-PRJ-008              P0                      Project and design access
                                                  is restricted to
                                                  authorised
                                                  organisation/project
                                                  scope.
  --------------------------------------------------------------------------

## 7. Site operations and quality

  -----------------------------------------------------------------------
  ID                      Priority                Requirement
  ----------------------- ----------------------- -----------------------
  FR-SITE-001             P0                      Site engineer can
                                                  submit a DPR for an
                                                  assigned site/project.

  FR-SITE-002             P0                      DPR supports
                                                  activities, progress,
                                                  workforce count,
                                                  materials, blockers,
                                                  safety/quality notes,
                                                  photos, and next-day
                                                  plan.

  FR-SITE-003             P0                      PM can review, comment,
                                                  and request correction
                                                  of a DPR.

  FR-QLT-001              P1                      Quality checklist
                                                  supports inspection
                                                  items, result,
                                                  evidence, and
                                                  inspector.

  FR-QLT-002              P1                      Failed items create
                                                  corrective actions and
                                                  can be reinspected
                                                  before closure.
  -----------------------------------------------------------------------

## 8. Procurement and inventory

  --------------------------------------------------------------------------
  ID                      Priority                Requirement
  ----------------------- ----------------------- --------------------------
  FR-PRO-001              P0                      Authorised
                                                  project/site/procurement
                                                  users can raise material
                                                  requests.

  FR-PRO-002              P0                      Procurement can review
                                                  requests and record vendor
                                                  quotations/comparisons.

  FR-PRO-003              P0                      Purchase approval uses
                                                  configurable thresholds
                                                  and approver routing.

  FR-PRO-004              P0                      A PO is created only after
                                                  required approval.

  FR-PRO-005              P0                      Delivery receipt records
                                                  ordered/received
                                                  quantities, condition,
                                                  discrepancies, evidence,
                                                  and verifier.

  FR-PRO-006              P1                      Emergency purchase
                                                  workflow records reason
                                                  and retrospective review
                                                  where configured.

  FR-INV-001              P0                      The application shall not
                                                  create a second
                                                  independent editable stock
                                                  ledger when Odoo is
                                                  authoritative.

  FR-INV-002              P1                      Integration shall support
                                                  idempotency, retry,
                                                  reconciliation, and
                                                  visible failure status.
  --------------------------------------------------------------------------

## 9. Workforce and attendance

  ----------------------------------------------------------------------------
  ID                      Priority                Requirement
  ----------------------- ----------------------- ----------------------------
  FR-WF-001               P0                      Workforce profiles support
                                                  configurable
                                                  employee/worker/contractor
                                                  categories.

  FR-ATT-001              P0                      Eligible users can check in
                                                  and check out with
                                                  server-generated timestamps.

  FR-ATT-002              P0                      Attendance evidence may
                                                  include selfie and location
                                                  according to configured
                                                  policy.

  FR-ATT-003              P0                      Worker/contractor users can
                                                  view and submit only their
                                                  own attendance data.

  FR-ATT-004              P0                      Attendance-only access is
                                                  enforced on every API route
                                                  and data query.

  FR-ATT-005              P1                      Attendance correction
                                                  requests follow an approval
                                                  and audit workflow.

  FR-ATT-006              P1                      Face verification/liveness
                                                  is enabled only after
                                                  provider, privacy, legal,
                                                  and fallback review.

  FR-WF-002               P0                      Contractor compensation
                                                  records can be linked to
                                                  verified work/milestones
                                                  rather than attendance
                                                  alone.
  ----------------------------------------------------------------------------

## 10. Finance

  -----------------------------------------------------------------------
  ID                      Priority                Requirement
  ----------------------- ----------------------- -----------------------
  FR-FIN-001              P0                      Authorised users can
                                                  record client receipts,
                                                  advances, milestones,
                                                  partial and final
                                                  payments.

  FR-FIN-002              P0                      Authorised users can
                                                  record project expenses
                                                  with receipt/evidence
                                                  and approval status.

  FR-FIN-003              P0                      Vendor payable records
                                                  support credit terms
                                                  and
                                                  partial/advance/final
                                                  payments.

  FR-FIN-004              P0                      Project financial view
                                                  distinguishes budget,
                                                  estimated, actual,
                                                  committed, forecast,
                                                  receipts, receivables,
                                                  and liabilities.

  FR-FIN-005              P0                      Financial corrections
                                                  preserve history
                                                  through
                                                  adjustment/reversal
                                                  records.

  FR-FIN-006              P1                      Statutory tax
                                                  configuration is
                                                  configurable and
                                                  validated by an
                                                  accountant before use.
  -----------------------------------------------------------------------

## 11. Documents, notifications and reports

  -----------------------------------------------------------------------
  ID                      Priority                Requirement
  ----------------------- ----------------------- -----------------------
  FR-DOC-001              P0                      Documents are stored
                                                  privately with tenant,
                                                  module, record,
                                                  uploader, version, and
                                                  access metadata.

  FR-DOC-002              P0                      Download/upload access
                                                  is authorised
                                                  server-side and uses
                                                  short-lived access
                                                  URLs.

  FR-NOT-001              P1                      The system generates
                                                  in-app/email
                                                  notifications for
                                                  configured workflow
                                                  events.

  FR-NOT-002              P2                      WhatsApp notifications
                                                  use official APIs,
                                                  templates where
                                                  required, and
                                                  consent/preferences.

  FR-REP-001              P1                      Dashboards and reports
                                                  respect role, tenant,
                                                  department, and project
                                                  scope.

  FR-REP-002              P1                      Exports are
                                                  permission-checked and
                                                  audited.
  -----------------------------------------------------------------------

## 12. Cross-cutting validation and state rules

-   A record cannot be moved to a state unless the actor has permission
    and required prior-state conditions are met.
-   An approval is tied to an immutable version/reference.
-   Tenant identity is server-assigned.
-   A project member cannot access another project by changing a URL or
    request ID.
-   Worker/contractor API access is allowlisted to attendance and own
    profile necessities only.
-   Currency and quantity calculations use decimal-safe arithmetic and
    documented rounding rules.
-   Historical records retain original actor attribution after account
    deactivation.
-   All external integration operations must be idempotent or safely
    deduplicated.

## 13. Acceptance and verification

Each P0 requirement must have at least one automated test or documented
UAT case. Security-sensitive requirements require negative tests,
including unauthorised API attempts, tenant-crossing attempts, stale
sessions, and role changes. Full test scenarios are in
`AIW_OS_TEST_PLAN_v0.1.md`.

## 14. Outstanding business decisions

Purchase thresholds; owner/dual approval policy; attendance correction
approvers; attendance retention and fallback; Odoo stock authority;
finance statutory configuration; exact lead/project status
configuration; client portal scope; notification provider;
authentication provider.
