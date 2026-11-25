# AIW OS --- System Architecture

**Document ID:** AIW-OS-ARCH-001\
**Version:** 0.1\
**Status:** Draft for review\
**Last updated:** 25 November 2026

------------------------------------------------------------------------

## 1. Purpose

This document defines the proposed system architecture for AIW OS, a
construction and interior business management platform. It translates
the product and functional requirements into an implementable technical
structure.

The architecture is designed to: - Support AIW's current operations
without hardcoded workforce or organisational limits. - Provide a
modular foundation for CRM, estimation, project delivery, design,
procurement, workforce, attendance, finance, and reporting. - Enforce
role-based and project-scoped access. - Be SaaS-ready through tenant
isolation from the beginning. - Keep the first release practical to
build, deploy, test, and maintain.

This is a proposed architecture, not a final technology lock-in.
Provider choices and deployment details marked TBD require validation.

## 2. Architecture decisions at a glance

  -----------------------------------------------------------------------
  Area                    Proposed direction      Status
  ----------------------- ----------------------- -----------------------
  Application             Modular monolith        Recommended
  architecture                                    

  Deployment model        Initially one AIW       Recommended
                          organisation;           
                          tenant-aware from day   
                          one                     

  Frontend                React + Vite +          Proposed
                          TypeScript              

  UI                      Tailwind CSS +          Proposed
                          shadcn/ui               

  Backend                 Node.js + Express +     Proposed
                          TypeScript              

  API style               REST API, versioned     Proposed
                          under `/api/v1`         

  Database                PostgreSQL              Recommended

  ORM / migrations        Prisma                  Proposed

  Authentication          Provider/library        TBD
                          selection pending       
                          security review         

  Authorisation           Server-side RBAC +      Required
                          resource and tenant     
                          scope checks            

  Background jobs         BullMQ + Redis if       Conditional
                          asynchronous workloads  
                          justify it              

  File storage            S3-compatible object    Recommended
                          storage                 

  Notifications           In-app and email        Phased
                          initially; WhatsApp     
                          integration later       

  Inventory               AIW OS integration      TBD
                          boundary; Odoo          
                          source-of-truth         
                          decision pending        

  Mobile                  Responsive web first;   Phased
                          dedicated mobile app    
                          later                   

  AI capabilities         Add after core          Later phase
                          workflows and data      
                          quality stabilise       

  Deployment              Containerised           TBD
                          application on managed  
                          cloud infrastructure    

  Observability           Centralised logs,       Required
                          metrics, error          
                          tracking, audit trails  
  -----------------------------------------------------------------------

## 3. Architectural style

### 3.1 Modular monolith

AIW OS should begin as a **modular monolith**, not a microservices
system.

The application is deployed as a small number of coordinated runtime
processes, but its code is divided into clearly bounded business
modules. Each module owns its business rules, validation, application
services, and data-access logic.

Benefits: - Faster initial development. - Simpler deployment and
debugging. - Easier database transactions across workflows. - Lower
infrastructure and operational overhead. - Clear boundaries that allow
individual modules to be extracted later if scale or team structure
requires it.

The modular monolith must not become a single unstructured codebase.
Module boundaries, dependency rules, and ownership of business logic are
mandatory.

### 3.2 High-level logical architecture

``` text
┌──────────────────────────────────────────────────────────────┐
│                         CLIENTS                              │
│  Admin / Management UI   Office UI   Project & Site UI       │
│                 Worker Attendance UI                         │
│              Future Android / iOS App                         │
└─────────────────────────────┬────────────────────────────────┘
                              │ HTTPS
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                    WEB APPLICATION                            │
│              React + Vite + TypeScript                        │
│  Routing | Forms | UI Components | API Client | State         │
└─────────────────────────────┬────────────────────────────────┘
                              │ REST / JSON
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                    API / APPLICATION                          │
│              Node.js + Express + TypeScript                   │
│                                                              │
│  Authentication   Tenant Context   RBAC / Policy Checks      │
│  Validation       Rate Limits      Audit Context             │
│                                                              │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐                │
│  │   CRM      │ │ Estimation │ │  Projects  │                │
│  ├────────────┤ ├────────────┤ ├────────────┤                │
│  │  Design    │ │ Procurement│ │ Workforce  │                │
│  ├────────────┤ ├────────────┤ ├────────────┤                │
│  │ Attendance│ │  Finance   │ │  Quality   │                │
│  ├────────────┤ ├────────────┤ ├────────────┤                │
│  │ Documents  │ │ Reporting  │ │ Notifications│              │
│  └────────────┘ └────────────┘ └────────────┘                │
│                                                              │
│       Shared domain services and integration adapters        │
└───────────────┬──────────────────┬───────────────────────────┘
                │                  │
                ▼                  ▼
┌────────────────────────┐  ┌──────────────────────────────────┐
│ PostgreSQL             │  │ External / supporting services   │
│ Business data          │  │ Object storage (documents/photos)│
│ Tenant-scoped records  │  │ Email provider                   │
│ RBAC and audit records │  │ WhatsApp Business Platform       │
│ Workflow and approvals │  │ Odoo (inventory, when approved)  │
└────────────────────────┘  │ Maps/location services           │
                            │ Attendance verification provider │
                            │ n8n / external automation        │
                            └──────────────────────────────────┘

                 Optional asynchronous processing
              ┌─────────────────────────────────────┐
              │ Redis + BullMQ workers (if needed)  │
              │ Emails | exports | reminders       │
              │ media processing | integrations    │
              └─────────────────────────────────────┘
```

## 4. Application components

### 4.1 Frontend application

The frontend is a responsive web application. It should provide
role-appropriate workspaces while relying on backend authorisation for
actual security.

Proposed responsibilities: - Authentication screens and session
handling. - Role-aware navigation and dashboards. - Forms, tables,
filters, search, and workflow actions. - Project, site, and customer
workspaces. - File upload and document previews. - Approval queues and
status timelines. - Attendance check-in/check-out interface. -
Accessible, responsive layouts for desktop, tablet, and mobile browsers.

Suggested frontend structure:

``` text
src/
  app/
    router/
    providers/
    layouts/
  modules/
    auth/
    dashboard/
    users/
    organisation/
    crm/
    estimation/
    quotations/
    projects/
    design/
    procurement/
    inventory/
    workforce/
    attendance/
    finance/
    quality/
    documents/
    notifications/
    reports/
  components/
    ui/
    forms/
    tables/
    feedback/
  lib/
    api/
    auth/
    permissions/
    validation/
  hooks/
  types/
```

The frontend may hide unavailable actions for usability, but it must
never be treated as the enforcement layer for permissions.

### 4.2 Backend application

The backend owns business rules, permissions, validation, transactions,
and data access.

Responsibilities: - Authenticate requests. - Resolve the current user
and tenant context. - Authorise every operation. - Validate input and
business state transitions. - Execute module application services. -
Enforce project and record-level access. - Persist changes
transactionally. - Write audit events for sensitive operations. -
Publish background jobs or domain events where needed. - Provide stable,
versioned APIs for future mobile clients.

Suggested backend structure:

``` text
src/
  app.ts
  server.ts
  config/
  common/
    auth/
    tenant/
    authorization/
    errors/
    validation/
    audit/
    events/
    storage/
  modules/
    users/
    organisation/
    crm/
    estimation/
    quotations/
    projects/
    tasks/
    design/
    procurement/
    inventory/
    workforce/
    attendance/
    finance/
    quality/
    documents/
    notifications/
    reports/
  integrations/
    email/
    whatsapp/
    odoo/
    maps/
    attendance-verification/
  jobs/
  database/
```

Each module should follow a consistent internal pattern:

``` text
module-name/
  routes/
  controllers/
  application/
  domain/
  repositories/
  schemas/
  policies/
  tests/
```

Avoid placing business rules directly in route handlers or frontend
components.

## 5. Business module boundaries

  -----------------------------------------------------------------------
  Module                  Owns                    Key dependencies
  ----------------------- ----------------------- -----------------------
  Authentication          Login, sessions,        Users
                          password/account        
                          recovery                

  Organisation            Tenant profile,         Users
                          departments,            
                          designations, teams     

  Users & RBAC            User lifecycle, roles,  Organisation, audit
                          permissions,            
                          assignments             

  CRM                     Leads, customers,       Users, documents
                          interactions,           
                          follow-ups              

  Estimation & BOQ        Rate library,           CRM, projects,
                          estimates, BOQ          procurement data
                          revisions               

  Quotations              Quotation versions,     Estimation, CRM,
                          dispatch, approval      approvals
                          records                 

  Projects                Project lifecycle,      Quotations, users
                          membership, milestones  

  Tasks                   Assignments,            Projects, notifications
                          dependencies,           
                          completion evidence     

  Design                  Design submissions,     Projects, documents
                          revisions, approvals    

  Procurement             Material requests,      Projects, vendors,
                          vendor quotes, POs,     inventory
                          receipts                

  Inventory               Stock locations,        Procurement, Odoo if
                          movements, balances,    integrated
                          integration boundary    

  Workforce               Employee/contractor     Users, attendance,
                          profiles and work       finance
                          arrangements            

  Attendance              Check-in/out, evidence, Workforce,
                          correction requests     projects/sites

  Finance                 Expenses, receipts,     Projects, procurement
                          payables, project cost  
                          views                   

  Quality                 Inspection plans,       Projects, tasks,
                          findings, rework,       documents
                          closure                 

  Documents               Metadata, access,       All modules
                          versions, storage       
                          references              

  Notifications           In-app/email/WhatsApp   All modules
                          delivery orchestration  

  Reporting               Aggregated operational  Read access to module
                          and financial reporting data
  -----------------------------------------------------------------------

A module may request another module's application service through a
defined interface. Avoid direct cross-module table manipulation.

## 6. Tenant isolation and organisation context

### 6.1 Tenant-ready from the beginning

Even if AIW is the only organisation at launch, tenant identity must be
part of the data and request model.

Every tenant-owned record must be associated with an `organisation_id`
(or equivalent tenant identifier). The authenticated request context
must resolve the user's organisation from trusted server-side identity
data, not from an arbitrary client-supplied value.

### 6.2 Required enforcement

-   Every tenant-owned query must be scoped to the authenticated tenant.
-   Every create operation must assign tenant identity server-side.
-   Every update/delete must verify tenant ownership.
-   Foreign-key relationships must not allow cross-tenant references.
-   Unique constraints must be tenant-aware where values are only unique
    within an organisation.
-   Background jobs and integrations must carry explicit tenant context.
-   File access must verify tenant and record permissions before issuing
    a download or upload URL.
-   Automated tests must attempt cross-tenant reads and writes.

PostgreSQL Row-Level Security (RLS) may be considered as an additional
defence-in-depth layer. If used, connection pooling and
transaction-scoped tenant context must be designed carefully. RLS does
not replace application-level authorisation.

### 6.3 Platform versus organisation administration

-   Platform Super Admin belongs to the SaaS control plane.
-   Organisation Super Admin belongs to one tenant.
-   Platform administration and customer business data access must be
    separated.
-   Any exceptional support access to tenant data must be explicitly
    authorised and audited.

## 7. Authentication and authorisation flow

### 7.1 Request flow

``` text
Client request
    |
    v
HTTPS / API gateway or reverse proxy
    |
    v
Authentication middleware
    |
    v
Resolve user + organisation context
    |
    v
Check account status and session validity
    |
    v
RBAC permission check
    |
    v
Resource / project / tenant scope check
    |
    v
Input validation
    |
    v
Application service + business rules
    |
    v
Database transaction
    |
    v
Audit event (where required)
    |
    v
Response
```

### 7.2 Authorisation requirements

-   Deny by default.
-   Enforce permissions on the backend for every endpoint.
-   Check both action permission and resource scope.
-   Do not trust role names or permissions supplied by the browser.
-   Revoke active sessions when an account is deactivated or privileged
    access is removed.
-   Prevent self-escalation of roles.
-   Apply attendance-only restrictions to workers and contractors at API
    and data-access layers.
-   Separate business approval permission from administration
    permission.
-   Make approval decisions against a specific record version.

Authentication provider selection is TBD. Evaluate secure session
handling, MFA support, account recovery, auditability, deployment model,
and long-term maintainability before choosing a provider.

## 8. Data architecture

### 8.1 Primary database

PostgreSQL is the recommended transactional system of record for AIW OS
business workflows.

Use Prisma for schema management and migrations if the team confirms it
meets the required query, transaction, and performance needs.

Core data groups: - Organisation and access control. - Users and
workforce profiles. - CRM and customers. - Estimates, BOQs, quotations,
and revisions. - Projects, tasks, milestones, and memberships. - Design
submissions and approvals. - Vendors, procurement, and purchase
orders. - Attendance and verification references. - Expenses, receipts,
payables, and cost allocations. - Quality inspections and corrective
actions. - Document metadata and audit history.

### 8.2 Data ownership

Each module owns its business data and exposes supported operations to
other modules. Cross-module workflows should use application services
and transactions rather than ad hoc direct database updates.

### 8.3 Financial precision and history

-   Use appropriate fixed-precision decimal types for currency and
    quantities; do not use floating-point types for financial values.
-   Store currency explicitly, even if INR is the initial default.
-   Preserve approved quotation and BOQ revisions.
-   Keep payment, receipt, expense, and stock movement histories.
-   Do not overwrite historical financial transactions to represent
    corrections; use reversal or adjustment records.
-   Store timestamps consistently in UTC and render them in the
    organisation's configured timezone.
-   Retain actor and timestamp metadata for material changes.

### 8.4 Documents and media

Store document metadata in PostgreSQL and file bytes in private object
storage.

Document metadata should include: - Tenant and owning module/record. -
Original filename and media type. - Storage key (not a public permanent
URL). - File size and checksum where appropriate. - Uploaded by and
upload time. - Version and status. - Access classification. -
Retention/deletion metadata.

Use short-lived signed URLs after server-side authorisation. Do not make
private project drawings, contracts, bills, or attendance evidence
publicly accessible.

## 9. Inventory and Odoo integration boundary

AIW has selected Odoo for inventory, but its operational setup and
configuration are not yet confirmed. AIW OS must not assume that Odoo is
already live or configured.

Recommended phased approach:

1.  Build procurement workflows and material-request records in AIW OS.
2.  Review the Odoo edition, deployment, enabled inventory features,
    product model, warehouses, units of measure, API access, and
    existing data.
3.  Decide which system is authoritative for stock quantities and stock
    movements.
4.  Define integration mappings and reconciliation rules.
5.  Implement integration only after the source-of-truth decision is
    approved.

Do not operate two independent editable stock ledgers. If Odoo becomes
the inventory system of record, AIW OS should send/receive controlled
commands and synchronise relevant references and status. If AIW OS is
selected as the stock system of record, Odoo should not independently
mutate the same stock balances.

Integration should be idempotent, retryable, observable, and reconciled.
Failed synchronisation must be visible to authorised users.

## 10. Background jobs and event handling

A background job system is useful for work that should not block a user
request.

Potential jobs: - Email and WhatsApp notification delivery. - Follow-up
and payment reminders. - Scheduled reports and exports. - Document
thumbnail or preview generation. - Large file processing. - Integration
synchronisation and retries. - Attendance exception alerts. - Approval
escalation.

Redis + BullMQ is a proposed option, not a mandatory day-one dependency.
Begin with synchronous processing for simple workflows. Introduce queues
when delivery reliability, workload, or response-time requirements
justify them.

Job requirements: - Retry policy with bounded attempts and backoff. -
Idempotency keys for external side effects. - Dead-letter or failed-job
visibility. - Tenant context and actor/system identity. - Structured
logs and correlation IDs. - No sensitive data in job logs.

## 11. Integrations

### 11.1 Email

Use a transactional email provider for invitations, approval
notifications, reminders, and reports. Keep provider credentials in
secret management and log delivery outcomes without exposing sensitive
content.

### 11.2 WhatsApp Business Platform

WhatsApp integration is a later phase. Use the official Business
Platform/API and approved message templates where required. Maintain
customer consent and communication preferences. Store delivery status
and message references, not unnecessary copies of sensitive conversation
content.

### 11.3 Maps and location

Location services may support site selection, distance context, and
attendance geofencing. Location should be collected only for a clearly
defined business purpose and only at the necessary precision and time.

### 11.4 Attendance verification

Selfie capture and face verification are not interchangeable. If face
verification is used, assess identity matching, liveness/anti-spoofing,
accuracy, failure handling, privacy, legal basis, retention, and vendor
data handling.

The architecture should support a provider adapter so the business is
not locked to one vendor. Provide a supervisor-assisted or other
approved fallback for users who cannot complete biometric verification.

### 11.5 n8n

n8n may orchestrate approved external workflows, such as lead
notifications or scheduled summaries. It must not become the
authoritative store for core business records or bypass AIW OS
authorisation and audit rules. Use scoped service credentials and signed
webhooks.

### 11.6 AI services

AI features should be introduced only after reliable structured data and
core workflows exist. Potential later use cases include enquiry
classification, document extraction, BOQ assistance, progress summaries,
and report drafting.

AI-generated outputs must be reviewable and approved by an authorised
person before they create financial commitments, change project status,
or communicate binding information to a client.

## 12. API design

Use a versioned REST API initially.

Proposed conventions: - Base path: `/api/v1` - JSON request and response
bodies. - Consistent error format. - Schema validation at API
boundaries. - Pagination for list endpoints. - Filtering and sorting
with allowlisted fields. - Idempotency for operations that may be
retried. - Correlation/request IDs. - Explicit status codes. - OpenAPI
documentation. - Rate limits on authentication, exports, and sensitive
endpoints.

Example resource patterns:

``` text
/api/v1/auth/*
/api/v1/users
/api/v1/roles
/api/v1/departments
/api/v1/leads
/api/v1/customers
/api/v1/estimates
/api/v1/quotations
/api/v1/projects
/api/v1/projects/:projectId/tasks
/api/v1/projects/:projectId/design-submissions
/api/v1/material-requests
/api/v1/purchase-orders
/api/v1/attendance/check-in
/api/v1/attendance/check-out
/api/v1/expenses
/api/v1/approvals
/api/v1/documents
/api/v1/reports
```

The API specification will define exact request schemas, responses,
permissions, and error codes in a separate document.

## 13. Deployment architecture

### 13.1 Initial production shape

A practical first production deployment may contain: - Reverse proxy
with TLS termination. - Frontend static assets served through a web
server or CDN. - Backend API application. - PostgreSQL database (prefer
managed database where feasible). - Private object storage. - Optional
Redis and worker process when background jobs are introduced. -
Centralised application and infrastructure monitoring.

Containerise the application to make development, testing, and
production environments more consistent. Choose AWS services and
deployment topology after considering cost, operational capability,
backup requirements, availability, and expected usage.

### 13.2 Environments

Maintain separate environments: - Local development. - Shared
development or integration. - Staging/UAT. - Production.

Production data must not be copied into development or staging without a
documented, privacy-safe process. Use separate credentials, databases,
storage buckets, and secrets for each environment.

### 13.3 CI/CD

Recommended pipeline: 1. Lint and type-check. 2. Unit tests. 3.
Integration tests. 4. Build frontend and backend. 5. Dependency and
secret scanning. 6. Apply reviewed database migrations. 7. Deploy to
staging. 8. Run smoke tests. 9. Obtain production approval. 10. Deploy
production and verify health.

Database migrations must be version-controlled, reviewed, and tested
against representative data. Avoid destructive schema changes without a
migration and rollback plan.

## 14. Security architecture

Minimum controls: - HTTPS for all environments outside local
development. - Secure password hashing if passwords are managed
directly. - MFA for privileged roles where supported. - Secure,
HttpOnly, SameSite cookie strategy if cookie-based sessions are used. -
CSRF protection where applicable. - Input validation and output
encoding. - SQL injection protection through safe parameterised database
access. - Rate limiting and abuse monitoring. - Secure file upload
validation and malware scanning strategy. - Secrets stored outside
source control. - Encryption at rest for database, backups, and object
storage. - Least-privilege database and service credentials. - Regular
dependency updates and vulnerability review. - Audit logging for
privileged and sensitive actions. - Backup and restore testing. - Tenant
isolation tests. - Security review before biometric attendance or public
SaaS onboarding.

## 15. Reliability, backup, and recovery

Define and test: - Automated database backups. - Point-in-time recovery
if supported by the chosen database service. - Object-storage versioning
or backup strategy for critical files. - Restore procedures and periodic
restore drills. - Monitoring for API errors, database availability,
storage failures, and job failures. - Health and readiness endpoints. -
Alerting for failed integrations and repeated authentication failures.

Recovery Point Objective (RPO) and Recovery Time Objective (RTO) are TBD
and must be selected based on business impact and infrastructure budget.

## 16. Observability and auditability

Operational logs and business audit logs serve different purposes.

**Operational logs** help diagnose application and infrastructure
issues. They should include timestamps, severity, service, environment,
request/correlation ID, and safe error context.

**Business audit logs** record who performed a meaningful action, what
record was affected, when it happened, and relevant before/after values.
Examples include: - User and permission changes. - Quotation creation,
revision, approval, and dispatch. - Design approval and supersession. -
Purchase approvals and PO changes. - Attendance corrections. - Financial
adjustments and payment status changes. - Document access or sharing
where required.

Do not log passwords, tokens, secrets, full payment credentials, or raw
biometric data.

## 17. Performance and scalability

Initial performance targets should be validated with real workflows and
load tests. Proposed starting objectives: - Common authenticated
page/API interactions should feel responsive under normal office and
site connectivity. - Paginate large lists rather than returning entire
datasets. - Index tenant, project, status, date, and frequently searched
fields based on query patterns. - Avoid N+1 query patterns. - Use
background jobs for expensive exports and media processing. - Use
caching only for data where invalidation and tenant separation are well
understood. - Keep dashboards efficient through indexed queries or
precomputed summaries when needed.

Do not introduce microservices, Kubernetes, or complex distributed
infrastructure until measured requirements justify them.

## 18. Testing strategy

Testing must cover: - Unit tests for domain rules and calculations. -
Integration tests for database repositories and transactions. - API
tests for validation and authorisation. - Cross-tenant isolation
tests. - Role and project-scope matrix tests. - Attendance-only
restrictions, including direct API attempts. - Approval workflow and
versioning tests. - Financial precision and adjustment tests. - File
access and signed URL expiry tests. - Integration retry and idempotency
tests. - End-to-end tests for lead-to-project and project-to-handover
journeys. - Load tests for expected concurrent office and site usage. -
Backup restoration and operational recovery tests.

## 19. Suggested implementation sequence

### Phase 0 --- Engineering foundation

-   Repository structure and coding standards.
-   Environment configuration and secrets.
-   Database, migrations, logging, error handling.
-   Authentication, tenant context, RBAC foundation.
-   CI pipeline and automated test framework.

### Phase 1 --- Organisation and core records

-   Organisation settings.
-   Dynamic user and workforce management.
-   Departments, designations, roles, permissions.
-   Customers and CRM.
-   Document storage foundation.

### Phase 2 --- Commercial and project initiation

-   Estimation and BOQ.
-   Quotation revisions and owner approval.
-   Project creation and assignment.
-   Project templates, tasks, milestones.

### Phase 3 --- Delivery and site operations

-   Design submissions and approvals.
-   Daily Progress Reports.
-   Site photos and documents.
-   Quality inspections and corrective actions.
-   Workforce profiles and attendance.

### Phase 4 --- Procurement and finance

-   Vendors and material requests.
-   Purchase orders and delivery verification.
-   Expenses, client receipts, vendor payables.
-   Project cost and profitability reporting.
-   Odoo integration after source-of-truth decision.

### Phase 5 --- Communication and optimisation

-   Email and in-app notifications.
-   WhatsApp Business integration.
-   Advanced dashboards and exports.
-   Mobile application.
-   AI-assisted workflows.

Phases may overlap after foundational dependencies are stable. Release
sequencing should be prioritised by operational value and risk.

## 20. Architecture risks and mitigations

  -----------------------------------------------------------------------
  Risk                    Impact                  Mitigation
  ----------------------- ----------------------- -----------------------
  Tenant scoping omitted  Cross-organisation data Central tenant context,
  from a query            exposure                repository policies,
                                                  automated isolation
                                                  tests

  Frontend-only           Users bypass            Backend authorisation
  permissions             restrictions through    on every operation
                          APIs                    

  Super Admin treated as  Unauthorised commercial Separate admin
  universal approver      commitments             permissions from
                                                  approval policies

  Two inventory systems   Stock discrepancies     Decide one source of
  both editable                                   truth before
                                                  integration

  Biometric verification  Workforce exclusion and Provider review,
  errors or privacy       legal/security risk     fallback, minimisation,
  issues                                          retention controls

  Overly broad module     Slow development and    Modular boundaries and
  coupling                fragile changes         defined
                                                  application-service
                                                  interfaces

  Premature microservices Operational complexity  Start with modular
                                                  monolith

  Financial values use    Rounding and            Fixed-precision decimal
  floating point          reconciliation errors   storage and tests

  Unreliable notification Missed approvals and    Queue, retry, delivery
  delivery                reminders               status, and monitoring

  Unreviewed AI output    Incorrect commitments   Human approval and
  changes business        or project actions      auditable AI-assisted
  records                                         workflows
  -----------------------------------------------------------------------

## 21. Open technical decisions

The following must be resolved before production architecture is
finalised:

1.  Authentication/session provider and MFA approach.
2.  Cloud provider, deployment region, and managed database choice.
3.  Expected concurrent users, data volume, photo/document volume, and
    availability needs.
4.  Object-storage provider and retention policy.
5.  Whether Redis/BullMQ is needed in the first release.
6.  Odoo edition, deployment, API access, and inventory source of truth.
7.  Attendance verification provider, liveness approach, fallback, and
    privacy/legal review.
8.  Email and WhatsApp providers.
9.  Organisation timezone and financial/accounting configuration.
10. RPO, RTO, backup retention, and disaster-recovery budget.
11. Whether PostgreSQL RLS will be enabled in addition to
    application-level tenant checks.

------------------------------------------------------------------------

## 22. Architecture acceptance checklist

The architecture is ready to move into detailed database and API design
when:

-   [ ] Module boundaries and ownership are accepted.
-   [ ] Modular monolith is accepted as the initial deployment approach.
-   [ ] Tenant identity is included in the data model and request
    context.
-   [ ] Organisation Super Admin is distinct from Platform Super Admin.
-   [ ] RBAC and project-level access are enforced server-side.
-   [ ] Worker and contractor attendance-only access is enforced
    server-side.
-   [ ] Business approval workflows are separate from system
    administration.
-   [ ] Document storage is private and permission-checked.
-   [ ] Inventory source-of-truth decision is documented before Odoo
    integration.
-   [ ] Attendance biometric/privacy approach is reviewed before
    production.
-   [ ] Backup, restore, monitoring, and deployment processes are
    defined.

**Document control:** This architecture is a proposed baseline for
review. It intentionally avoids premature commitments to infrastructure
vendors and third-party providers. The next design artefacts should
define the database schema and API contracts while preserving the
module, tenant, security, and workflow boundaries described here.
