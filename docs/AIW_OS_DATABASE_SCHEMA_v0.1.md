# AIW OS --- Database Schema and Data Model

**Document ID:** AIW-OS-DB-001 \| **Version:** 0.1 \| **Status:** Draft
logical schema \| **Date:** 25 November 2026

## 1. Design principles

-   PostgreSQL as the transactional database.
-   Tenant-aware from the first migration.
-   No hardcoded headcount, departments, designations, roles, or role
    counts.
-   UUID primary keys for externally referenced entities.
-   `organisation_id` on tenant-owned records; enforce tenant-aware
    foreign-key relationships where practical.
-   UTC timestamps; render in organisation timezone.
-   Decimal types for money and measured quantities.
-   Preserve business history, revisions, approvals, and audit events.
-   Store files in private object storage; database stores metadata and
    object keys.
-   Do not store raw biometric templates or images unless a reviewed
    provider design requires it.

## 2. Naming and common columns

Suggested conventions: snake_case table/column names; UUID `id`;
`created_at`, `updated_at`; optional `created_by_user_id`,
`updated_by_user_id`; `organisation_id` on tenant tables; `deleted_at`
only for records where soft deletion is appropriate. Financial and audit
records should generally be reversed/voided rather than physically
deleted.

## 3. Core identity and tenant tables

### organisations

`id`, `name`, `legal_name`, `slug`, `status`, `timezone`,
`default_currency`, `settings_json`, `created_at`, `updated_at`.

### users

`id`, `email`, `phone`, `display_name`, `auth_subject`, `status`,
`last_login_at`, `created_at`, `updated_at`. Authentication secrets
should be handled by the selected identity provider or securely hashed
if locally managed. A user identity may be tenant-bound in the first
release; cross-tenant identity model must be decided before SaaS launch.

### employee_profiles

`id`, `organisation_id`, `user_id` (nullable for non-login workforce
records), `employee_code`, `employment_type_id`, `department_id`,
`designation_id`, `manager_user_id`, `joining_date`, `leaving_date`,
`status`, `profile_data_json`.

### departments

`id`, `organisation_id`, `name`, `code`, `parent_department_id`,
`status`.

### designations

`id`, `organisation_id`, `name`, `code`, `description`, `status`.

### employment_types

`id`, `organisation_id`, `name`, `category`, `status`. Examples:
employee, worker, contractor, consultant. Configurable.

### roles

`id`, `organisation_id`, `name`, `code`, `description`,
`is_system_role`, `status`. Organisation Super Admin is a protected
system role within a tenant.

### permissions

`id`, `code`, `module`, `action`, `description`. Permission catalogue
may be global/versioned; tenant assignment is through role mappings.

### role_permissions

`id`, `organisation_id`, `role_id`, `permission_id`, `scope_type`,
`effect`, `constraints_json`.

### user_roles

`id`, `organisation_id`, `user_id`, `role_id`, `valid_from`,
`valid_until`, `assigned_by_user_id`.

### project_memberships

`id`, `organisation_id`, `project_id`, `user_id`, `project_role`,
`status`, `valid_from`, `valid_until`.

### invitations

`id`, `organisation_id`, `email`, `invited_by_user_id`, `token_hash`,
`expires_at`, `accepted_at`, `status`.

### audit_logs

`id`, `organisation_id`, `actor_user_id`, `action`, `resource_type`,
`resource_id`, `occurred_at`, `request_id`, `ip_hash_or_metadata`,
`before_json`, `after_json`, `reason`. Do not store credentials or raw
biometric data.

## 4. CRM and commercial tables

-   `leads`: customer prospect, source, stage, owner, requirements,
    budget range, target timeline, lost reason.
-   `customers`: legal/display name, contact information, billing
    details, customer type, status.
-   `customer_contacts`: multiple contacts per customer.
-   `lead_interactions`: calls, meetings, notes, messages, next action.
-   `estimates`: customer/lead reference, project type, status, revision
    number, currency, totals.
-   `estimate_items`: description, category, unit, quantity, wastage,
    rate, labour/material classification, tax code, line totals.
-   `rate_catalogue_items`: reusable rate, unit, validity period,
    source, approval status.
-   `quotations`: customer, estimate reference, quotation number,
    current revision, status.
-   `quotation_versions`: immutable version number, snapshot
    totals/content, created by, submitted at.
-   `quotation_approvals`: version ID, approver, decision, comments,
    timestamp.
-   `quotation_dispatches`: version ID, recipient, channel, sent status,
    sent time, external message reference.

Use fixed precision such as `NUMERIC(18,2)` for currency and an
appropriate higher precision for quantities/rates; confirm scale with
actual BOQ requirements. Store currency code on commercial documents.

## 5. Project delivery tables

-   `projects`: project number, customer, accepted quotation version,
    category, status, name, site address, dates, project manager,
    currency.
-   `project_sites`: project, site name/address, geo reference where
    justified, status.
-   `project_memberships`: user and project assignment (defined above).
-   `project_milestones`: name, planned/actual dates, status,
    dependency.
-   `task_templates`: project type, template name, version, status.
-   `task_template_items`: task definition, sequence, dependency,
    default duration/role.
-   `tasks`: project, site, title, description, assignee, status,
    priority, dates, completion evidence.
-   `task_dependencies`: predecessor/successor task IDs.
-   `task_comments`: task, author, content, timestamp.
-   `daily_progress_reports`: project/site, report date, author,
    workforce count, activities, progress, blockers, safety/quality
    notes, next-day plan, review state.
-   `dpr_media`: DPR and document references.

## 6. Design and document tables

-   `design_packages`: project, discipline, title, current version,
    status.
-   `design_versions`: package, version number, document reference,
    change summary, submitted by, submitted at.
-   `design_approvals`: version, stage (internal/client), approver,
    decision, comments, timestamp.
-   `documents`: organisation, module, record type/id, storage key,
    filename, media type, size, checksum, classification, uploader,
    version, status, retention metadata.
-   `document_versions`: document logical ID, version number, storage
    key, checksum, uploader, timestamp.
-   `document_access_events`: document, user, action, timestamp, request
    ID where audit requirements justify it.

Store object bytes in private object storage. Do not expose permanent
public URLs.

## 7. Procurement and inventory tables

-   `vendors`: organisation, vendor code, name, contacts, tax
    identifiers where required, payment terms, status.
-   `material_requests`: project/site, requester, required-by date,
    status, reason.
-   `material_request_items`: item/specification, unit, requested
    quantity, approved quantity.
-   `vendor_quotations`: vendor, request, quote reference, validity,
    currency, total, document reference.
-   `vendor_quotation_items`: item, quantity, rate, taxes, delivery
    terms.
-   `purchase_orders`: PO number, vendor, project, approval state,
    version, currency, totals.
-   `purchase_order_items`: item/specification, quantity, rate, tax,
    delivery schedule.
-   `purchase_approvals`: policy/version, approver, decision, timestamp,
    comments.
-   `goods_receipts`: PO, received date, receiver, status, evidence.
-   `goods_receipt_items`: ordered/received/rejected quantities,
    condition, discrepancy.
-   `inventory_external_refs`: Odoo instance/record identifiers, sync
    status, last sync, mapping.
-   `integration_events`: direction, external system, event key,
    idempotency key, status, retry count, error summary.

If AIW OS becomes stock system of record, add a fully specified stock
ledger with immutable movements, warehouses, locations, units,
reservations, issues, returns, and reconciliation. Do not add editable
on-hand balances without a movement ledger and source-of-truth decision.

## 8. Workforce and attendance tables

-   `workforce_profiles`: organisation, person identity/profile,
    employment type, active status, emergency contact fields subject to
    privacy policy.
-   `attendance_policies`: organisation/site policy, allowed window,
    grace period, location rules, verification mode.
-   `attendance_events`: workforce/user, project/site, event type
    (check-in/check-out), server timestamp, status, source, policy
    reference.
-   `attendance_evidence`: event, private object key/provider reference,
    evidence type, capture metadata, retention expiry. Restrict access
    tightly.
-   `attendance_verifications`: event, provider, result,
    confidence/reference, liveness result, failure code; avoid storing
    unnecessary biometric vectors.
-   `attendance_correction_requests`: event, requester, reason, proposed
    correction, status, reviewer, decision.
-   `attendance_daily_summaries`: derived attendance summary;
    rebuildable and not the sole source of truth.
-   `work_completion_records`: contractor, project/task/work item,
    quantity or milestone, evidence, verifier, approval status, payable
    reference.

Server timestamp is authoritative. GPS/selfie are evidence and may be
unavailable; fallback handling must be defined. Contractor pay must be
based on verified work/milestones where agreed, not simply attendance.

## 9. Finance tables

-   `project_budgets`: project, budget version, approved amount,
    currency, approver.
-   `expenses`: project, category, vendor/payee, amount, currency, date,
    payment method, submitter, status, receipt document.
-   `expense_approvals`: expense, approver, decision, timestamp.
-   `client_invoices_or_claims`: project, milestone, amount, due date,
    status; final statutory invoice handling must be validated.
-   `client_receipts`: customer/project, amount, currency, received
    date, method, reference.
-   `vendor_bills`: vendor, PO/receipt references, amount, due date,
    status.
-   `vendor_payments`: vendor bill, amount, date, method, reference.
-   `financial_adjustments`: original transaction, adjustment/reversal
    type, amount, reason, approver.
-   `cost_allocations`: transaction, project, cost category, allocated
    amount.
-   `approval_policies`, `approval_policy_steps`, `approval_instances`,
    `approval_actions`: configurable approval routing and decision
    history.

Do not calculate profit by adding cash receipts alone. Define accounting
recognition and cost allocation rules with an accountant before relying
on financial reports.

## 10. Notifications and integration tables

-   `notification_preferences`: user, channel, event type,
    opt-in/status.
-   `notifications`: recipient, event, content reference, read status,
    created time.
-   `notification_deliveries`: channel, provider reference, status,
    attempt count, sent/delivered times, error.
-   `webhook_endpoints`: organisation, endpoint, secret reference, event
    subscriptions, status.
-   `webhook_deliveries`: event, endpoint, attempt, response status,
    next retry.
-   `background_job_records` only if operationally required; queue
    infrastructure may own job state.

## 11. Relationship overview

-   Organisation 1---many users, departments, designations, roles,
    projects, vendors, and business records.
-   User many---many roles through `user_roles`.
-   User many---many projects through `project_memberships`.
-   Lead may convert to customer; customer may have many projects.
-   Estimate has many revisions/items; quotation versions reference
    estimate snapshots.
-   Project has tasks, milestones, sites, DPRs, design packages,
    procurement records, expenses, and quality inspections.
-   PO has items, approvals, and goods receipts.
-   Attendance event belongs to a workforce identity and optionally
    project/site.
-   Financial transactions reference project/customer/vendor and
    supporting documents.

## 12. Integrity constraints and indexes

-   Unique `(organisation_id, code)` for tenant-scoped codes.
-   Unique `(organisation_id, quotation_number)` and
    `(organisation_id, project_number)`.
-   Unique `(quotation_id, version_number)` and
    `(design_package_id, version_number)`.
-   Foreign keys should prevent cross-tenant references; consider
    composite keys including `organisation_id` for tenant-owned
    relations.
-   Index `(organisation_id, status)`, `(organisation_id, created_at)`,
    project/date, assignee/status, and other observed query patterns.
-   Index attendance by workforce/user and event timestamp.
-   Index approvals by approver/status/created date.
-   Use constraints for nonnegative quantities/amounts where valid.
-   Avoid cascading deletes for audit, financial, approval, and
    historical records.

## 13. Migration and retention

-   All schema changes use reviewed, version-controlled migrations.
-   Test migrations against representative datasets.
-   Use expand/migrate/contract for risky production changes.
-   Define retention/deletion policy by record class, especially
    attendance evidence, identity data, documents, and audit logs.
-   Deletion requests must preserve records legally required for
    business/accounting while deleting or anonymising data where lawful
    and appropriate.

## 14. Decisions still required

Identity model across multiple tenants; exact money/quantity precision;
statutory invoice/accounting model; attendance evidence retention;
biometric provider and storage approach; Odoo source of truth; whether
RLS is used; data residency; archival policy.

**Important:** This is a logical schema, not a final executable Prisma
schema. Detailed constraints, indexes, relation names, and migrations
must be reviewed during implementation.
