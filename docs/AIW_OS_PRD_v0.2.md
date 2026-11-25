# AIW OS --- Product Requirements Document

**Document ID:** AIW-OS-PRD-001 \| **Version:** 0.2 \| **Status:** Draft
baseline \| **Date:** 25 November 2026

## 1. Product overview

AIW OS is a construction and interior business management platform for
managing the business lifecycle from enquiry and estimation through
project execution, procurement, workforce attendance, finance, quality
inspection, and handover. The first deployment is for AIW India. The
product must be designed tenant-aware so it can later support multiple
customer organisations as SaaS.

## 2. Business context

AIW delivers residential and commercial construction, interior fitouts,
turnkey projects, renovations, and related installations. Current
processes rely heavily on calls, WhatsApp, spreadsheets, site visits,
and a third-party attendance application. AIW has selected Odoo for
inventory, but operational configuration and integration readiness are
not yet confirmed. AIW OS must avoid creating a second conflicting stock
ledger.

## 3. Product goals

-   Centralise customer, project, design, procurement, workforce,
    attendance, and financial information.
-   Improve visibility into project status, blockers, cost, cash flow,
    and profitability.
-   Standardise repeatable workflows using templates, approvals,
    checklists, and audit trails.
-   Reduce manual follow-ups and duplicated data entry.
-   Provide secure access appropriate to each role and project
    assignment.
-   Support future mobile use and multi-tenant SaaS without premature
    distributed-system complexity.

## 4. Non-goals for the initial release

-   Replacing a full statutory accounting/ERP suite without accountant
    validation.
-   Operating two independent inventory ledgers alongside Odoo.
-   Automatically approving quotations, purchases, payments, or designs
    using AI.
-   Building microservices or Kubernetes infrastructure before measured
    need.
-   Treating face recognition as the only attendance method.
-   Shipping a native mobile app before the responsive web workflows are
    proven.

## 5. Organisation and workforce assumptions

The current planning snapshot is approximately 40 people: 2
owners/management, 2 office/admin, 1 architect/interior designer, 5
project managers, 4 site engineers/supervisors, 1 accounts staff member,
2 procurement staff, and 23 workers/contractors. This is illustrative
current-state information only, not a fixed capacity or system limit.

The system must support unlimited-by-design organisational growth
subject to infrastructure and commercial capacity: create, edit,
deactivate, reactivate, transfer, and reassign users; dynamically create
departments, designations, employment categories, roles, permissions,
teams, and project assignments. No employee, department, or role count
may be hardcoded.

Each organisation has a general **Organisation Super Admin** who can
administer its users, roles, departments, designations, permissions,
access assignments, settings, and audit logs. Administration does not
automatically confer commercial approval authority. In future SaaS, a
separate **Platform Super Admin** manages the SaaS control plane and
must not be conflated with a tenant's Organisation Super Admin.

Workers and contractors receive attendance-only access, enforced on the
backend and not merely by hiding UI navigation.

## 6. Users and access

Starting roles: Organisation Super Admin, Owner/Management,
Office/Admin, Project Manager, Site Engineer/Supervisor,
Architect/Interior Designer, Accounts, Procurement, Worker/Contractor.
Roles are configurable; departments and designations are organisational
attributes, not security roles. Project-based roles are scoped to
assigned projects/sites. Finance access is separately configurable.

## 7. Scope and functional requirements

### 7.1 Organisation, identity and access

-   Secure authentication, session management, account recovery, and
    optional/required MFA for privileged roles.
-   Dynamic user lifecycle, invitations, status changes,
    department/designation assignment, role assignment, and project
    membership.
-   Granular permissions by module, action, and scope.
-   Tenant isolation from day one.
-   Audit logs for sensitive administrative and business actions.

### 7.2 CRM and customer management

-   Capture enquiry source, contact details, property/location, service
    type, requirements, budget, timeline, and follow-up owner.
-   Configurable lead stages: New, Contacted, Qualified, Site Visit,
    Estimation, Quotation, Negotiation, Won, Lost.
-   Record calls, meetings, notes, reminders, attachments, and lost
    reasons.
-   Convert won leads into customers/projects without re-entering data.

### 7.3 Estimation, BOQ and quotations

-   BOQ line items with description, category, unit, quantity, wastage,
    rate, labour/material classification, tax treatment, and totals.
-   Reusable rate library with standard and project/vendor-specific
    rates.
-   Support overhead, margin, discount, tax, contingencies, and revision
    history.
-   Import/export spreadsheet data and generate client-ready PDF.
-   Owner/authorised management approval required before official
    quotation dispatch.
-   Every material change after approval creates a new version and
    requires reapproval.

### 7.4 Project delivery

-   Create a project from an accepted quotation while preserving the
    approved quotation version.
-   Project categories: residential construction, commercial
    construction, residential interiors, commercial fitout, renovation,
    turnkey, and configurable future types.
-   Project states: Approved, Planning, In Progress, On Hold, Quality
    Inspection, Completed, Handed Over, Cancelled (with controlled
    transitions).
-   Assign project manager, engineers, designers, procurement
    participants, milestones, tasks, and project templates.
-   Track dependencies, due dates, priorities, evidence, blockers,
    comments, and change history.

### 7.5 Design and documents

-   Design workflow: designer submission → internal review → owner
    approval → client review → client approval → ready for execution.
-   Version drawings, floor plans, 3D renders, specifications, and
    design documents.
-   Mark superseded versions; only client-approved current version is
    execution-authoritative.
-   Store contracts, BOQs, POs, invoices, site photos, reports, and
    handover documents in private storage with access control.

### 7.6 Site operations and quality

-   Daily Progress Report includes date, project/site, workforce count,
    activities, progress, materials, issues, safety/quality
    observations, photos, and next-day plan.
-   PM reviews DPRs; owners see organisation-level progress.
-   Quality checklists support pass/fail, findings, corrective action,
    reinspection, closure, and evidence.
-   Site engineers, PMs, and owners can participate according to
    permissions.

### 7.7 Procurement and inventory

-   Material request → procurement review → vendor quotation comparison
    → approval → PO → delivery → quantity/quality verification → receipt
    → inventory update/issue.
-   Configurable monetary/category/project approval rules; exact
    thresholds are TBD.
-   Support regular and project-specific vendors, credit terms, and
    emergency purchase path.
-   Odoo is not assumed operational. Decide source of truth before stock
    integration. Never allow two independent editable ledgers for the
    same stock.

### 7.8 Workforce and attendance

-   Maintain employee, worker, contractor, and other configurable
    workforce profiles.
-   Employee monthly salary model; contractor compensation based on
    verified completed work/milestones, not attendance alone.
-   Attendance check-in and check-out with server timestamp; selfie and
    location evidence as configured.
-   Face verification and liveness are separate capabilities and require
    provider/security/privacy review.
-   Provide supervisor-assisted or other approved fallback.
-   Attendance corrections require a controlled workflow and audit
    trail.
-   Workers/contractors can access only their own attendance
    actions/history.

### 7.9 Finance

-   Track client advances, milestone/work-stage receipts, partial
    payments, final payments, and receivables.
-   Track project expenses with category, vendor/payee, date, amount,
    method, project allocation, receipt, submitter, and approval.
-   Track vendor advances, credit periods, partial/milestone/final
    payments, and liabilities.
-   Show contract value, approved budget, estimated cost, actual cost,
    committed cost, forecast cost, receipts, receivables, liabilities,
    and margin distinctly.
-   Do not equate cash received with revenue or profit.
-   GST/TDS and statutory accounting configuration must be validated by
    a qualified accountant.

### 7.10 Notifications and reporting

-   In-app and email notifications initially; WhatsApp Business Platform
    later.
-   Notify on lead follow-ups, approvals, task assignment, DPR,
    procurement, delivery, payments, attendance exceptions, and
    inspections.
-   Dashboards and reports scoped by role, project, department, and
    organisation.

## 8. Non-functional requirements

-   Security: backend authorisation, tenant isolation, least privilege,
    auditability, secure secrets, encryption, backups.
-   Availability and recovery targets: to be agreed after operational
    impact assessment.
-   Performance: paginate large datasets; index common
    tenant/project/status/date queries; load test realistic concurrent
    usage.
-   Accessibility and responsive layouts for office desktops and site
    mobile devices.
-   Maintainability: modular monolith, clear module boundaries,
    automated tests, versioned APIs.
-   Privacy: data minimisation, retention schedules, restricted
    biometric evidence, consent/legal review where required.
-   Data integrity: decimal financial fields, immutable transaction
    history, versioned approvals and documents.

## 9. Success measures

-   Reduced time to find current project/customer information.
-   Percentage of active projects with current DPR and task status.
-   Follow-up completion rate and lead conversion visibility.
-   Percentage of quotations with versioned approval evidence.
-   Procurement cycle time and delivery discrepancy rate.
-   Attendance exception resolution time.
-   Project cost forecast accuracy and visibility into
    receivables/payables.
-   User adoption and reduction in spreadsheet/WhatsApp-only operational
    records.

## 10. Delivery approach

Build in stages: engineering foundation and access control;
organisation/CRM; BOQ/quotation/project initiation; project/design/site
operations; workforce/attendance; procurement/finance;
communications/reporting; mobile and AI enhancements. Prioritise
reliable workflows and auditability before advanced automation.

## 11. Open decisions

Authentication provider; cloud deployment and region; concurrent-user
and storage estimates; Odoo edition/configuration/source of truth;
purchase approval thresholds; two-owner approval rules; attendance
verification provider and fallback; retention periods; finance/statutory
rules; email/WhatsApp providers; RPO/RTO; exact mobile-app scope.

**Document control:** This is a baseline product definition. Open
decisions must be resolved through implementation discovery and recorded
in the relevant design documents. Current headcount is a snapshot only.
