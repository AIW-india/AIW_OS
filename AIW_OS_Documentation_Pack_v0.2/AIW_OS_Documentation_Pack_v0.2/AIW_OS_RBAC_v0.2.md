# AIW OS --- Role-Based Access Control (RBAC)

**Document ID:** AIW-OS-RBAC-001\
**Version:** 0.2\
**Status:** Draft for review\
**Last updated:** 25 November 2026

------------------------------------------------------------------------

## 1. Purpose

This document defines the access-control model for AIW OS. It specifies
how users are created and managed, how roles and permissions are
assigned, and how access is restricted across business modules and
project data.

The system must be flexible as AIW grows. The current workforce size and
department breakdown are planning snapshots only. They must never be
treated as fixed limits or hardcoded assumptions.

## 2. Foundational principles

1.  **Dynamic workforce:** The organisation can add, deactivate,
    reactivate, transfer, or reassign users at any time.
2.  **One Organisation Super Admin:** Each customer organisation has a
    general Super Admin who can administer users, roles, departments,
    permissions, and organisation-level settings.
3.  **Least privilege:** Users receive only the access required for
    their work.
4.  **Separation of duties:** Technical administration does not
    automatically confer business approval authority.
5.  **Project-scoped access:** Project team members normally see only
    projects to which they are assigned, subject to their role.
6.  **Attendance-only workforce access:** Workers and contractors have
    access only to their own permitted attendance actions and attendance
    history.
7.  **Auditable administration:** Sensitive access changes and business
    approvals are logged.
8.  **Tenant isolation:** In the future SaaS version, one customer
    organisation must never access another organisation's data.

## 3. Administrative levels

### 3.1 Platform Super Admin (future SaaS)

A platform-level role operated by the SaaS provider. It manages the SaaS
service and customer-organisation lifecycle, such as tenant
provisioning, platform configuration, subscription administration, and
platform-wide operational controls.

This role is distinct from AIW's internal administrator. Platform Super
Admin access must not be used as a routine way to view customer business
data. Any exceptional support access must be controlled, time-limited
where practical, justified, and audited.

### 3.2 Organisation Super Admin

Each customer organisation, including AIW, has an Organisation Super
Admin role. This is the general administrator for that organisation.

The Organisation Super Admin can: - Invite, create, edit, deactivate,
and reactivate user accounts. - Assign and change roles. - Create and
manage departments, teams, designations, and reporting relationships. -
Configure role permissions and project-access assignments. - Manage
organisation-level settings and access policies. - Reset or initiate
account recovery according to the authentication policy. - Review
organisation audit logs and access history. - Manage attendance-user
enrolment and status, subject to the attendance privacy policy.

**Important:** Organisation Super Admin status does not automatically
grant authority to approve quotations, client discounts, payments,
vendor payments, purchase requests, or other commercial decisions. Those
permissions are granted separately through the business approval matrix.

The organisation should nominate the authorised Super Admin account
holder(s). The product supports the role; the number of people assigned
to it is configurable. AIW may begin with one general Super Admin.

## 4. Dynamic organisation and workforce model

The organisation structure must be data-driven.

### 4.1 No fixed headcount

The current AIW workforce estimate is approximately 40 people. This is
an initial planning snapshot, not a technical or licensing limit.

The application must not: - Hardcode the number of employees, workers,
contractors, departments, or project teams. - Assume that a department
always has a fixed number of users. - Require a code deployment to add a
new department, designation, role, or user. - Use fixed employee lists
in application logic.

Any product or infrastructure capacity limits must be handled separately
from the organisation's business structure and clearly communicated.

### 4.2 User lifecycle

The system must support these user states:

  -----------------------------------------------------------------------
  State                               Meaning
  ----------------------------------- -----------------------------------
  Invited                             Invitation created; account setup
                                      not completed

  Active                              User can sign in and use permitted
                                      features

  Suspended                           Access temporarily blocked

  Deactivated                         User has left or no longer requires
                                      access

  Pending reactivation                Optional workflow if reactivation
                                      requires review
  -----------------------------------------------------------------------

Deactivation must revoke access without deleting historical project,
approval, attendance, or financial records.

Reactivation should restore access only after an administrator confirms
the user's current role, department, and project assignments. Previous
permissions must not be silently restored if they are no longer
appropriate.

### 4.3 Configurable organisation structure

Super Admin can create, edit, archive, and manage: - Departments (for
example, Projects, Design, Accounts, Procurement, Administration). -
Designations (for example, Project Manager, Site Engineer, Architect). -
Teams and reporting relationships. - Employment categories (employee,
worker, contractor, consultant, or other configurable categories). -
User-role assignments. - Project and site assignments.

Departments and designations are organisational attributes; they are not
automatically security roles. Access is granted through roles and
permissions.

## 5. Role model

The following are proposed starting roles. The system must allow the
Organisation Super Admin to create additional roles, duplicate existing
roles, and configure permissions without code changes.

  -----------------------------------------------------------------------
  Role                    Intended responsibility Default access scope
  ----------------------- ----------------------- -----------------------
  Organisation Super      Organisation-wide       Organisation-wide
  Admin                   application and user    administration
                          administration          

  Owner / Management      Business oversight and  Organisation-wide
                          reserved approvals      business visibility,
                                                  subject to
                                                  configuration

  Office / Admin          General office          Configurable modules
                          operations and assigned 
                          administrative tasks    

  Project Manager         Manage assigned         Assigned projects
                          projects and coordinate 
                          delivery                

  Site Engineer /         Site execution,         Assigned projects/sites
  Supervisor              updates, inspections,   
                          and attendance          
                          verification            

  Architect / Interior    Designs, drawings,      Assigned projects
  Designer                revisions, and design   
                          approvals workflow      

  Accounts                Financial records,      Organisation finance,
                          receivables, payables,  with configurable
                          and reporting           restrictions

  Procurement             Vendor coordination,    Procurement records and
                          material requests,      assigned projects
                          purchase orders, and    
                          receipts                

  Worker / Contractor     Attendance actions and  Own attendance only
                          own attendance history  
  -----------------------------------------------------------------------

The role list is not exhaustive. New roles such as HR, Quantity
Surveyor, Storekeeper, Safety Officer, or Marketing Executive must be
configurable.

## 6. Permission model

Permissions should be granular and action-based. At minimum, the
permission engine should support:

-   `view`
-   `create`
-   `edit`
-   `delete` or `archive`
-   `approve`
-   `reject`
-   `assign`
-   `export`
-   `manage`
-   `administer`

Permissions should be defined per module and, where necessary, per
record or project scope.

### 6.1 Scope levels

  -----------------------------------------------------------------------
  Scope                               Meaning
  ----------------------------------- -----------------------------------
  Own records                         Records created by or belonging to
                                      the signed-in user

  Assigned project/site               Records associated with projects or
                                      sites assigned to the user

  Department                          Records within the user's
                                      department

  Organisation                        Records across the organisation

  Tenant/platform                     SaaS platform-level operations,
                                      reserved for the Platform Super
                                      Admin
  -----------------------------------------------------------------------

A permission is effective only when both the action and the applicable
scope allow it.

### 6.2 Suggested module permissions

The table below is a proposed baseline. The Organisation Super Admin can
configure role permissions, while reserved business approval rules
remain subject to the approval matrix.

  ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  Module           Super Admin      Owner / Management  Office / Admin Project Manager    Site Engineer       Designer         Accounts           Procurement     Worker /
                                                                                                                                                                  Contractor
  ---------------- ---------------- ------------------- -------------- ------------------ ------------------- ---------------- ------------------ --------------- ------------
  User and role    Full             No by default       Limited if     No                 No                  No               No                 No              No
  administration                                        granted                                                                                                   

  Departments and  Full             View                Manage if      No                 No                  No               No                 No              No
  designations                                          granted                                                                                                   

  CRM and          Full             Full                Configurable   Assigned leads if  No                  No               No                 No              No
  enquiries                                                            granted                                                                                    

  Customer records Full             Full                Configurable   Assigned projects  Limited project     Limited project  Billing context    Delivery        No
                                                                                          context             context                             context         

  Quotations and   Full             View and approve    Prepare if     Prepare/review     Quantity input if   Design-scope     Cost/tax review if Vendor-rate     No
  BOQ              administration                       granted        assigned projects  granted             input            granted            input           

  Projects and     Full             Organisation-wide   Configurable   Full on assigned   Update assigned     Design tasks on  Financial view if  Procurement     No
  tasks            administration                                      projects           tasks               assigned         granted            tasks           
                                                                                                              projects                                            

  Drawings and     Full             View and owner      Upload if      View/review        View latest         Create/edit      No by default      No by default   No
  designs          administration   approval            granted        assigned projects  approved execution  revisions                                           
                                                                                          set                                                                     

  Procurement and  Full             View and reserved   Configurable   Request/review     Raise material      No by default    Financial          Manage          No
  purchase orders  administration   approvals                          assigned projects  requests                             review/payment     procurement     
                                                                                                                               records            workflow        

  Inventory        Full             View                Configurable   Project            Issue/consumption   No by default    Cost view if       Inventory       No
                   administration                                      consumption view   updates if granted                   granted            operations if   
                                                                                                                                                  designated      

  Attendance       Full             View reports        Manage if      Team/site review   Verify assigned     No by default    Payroll-relevant   No              Own
  administration   administration                       granted        if granted         site attendance if                   reports if granted                 attendance
                                                                                          granted                                                                 only

  Finance and      Full             Organisation-wide   No by default  Assigned-project   No by default       No by default    Manage finance     Purchase-cost   No
  accounting       administration   view and configured                financial summary                                       records            context         
                                    approvals                          if granted                                                                                 

  Vendor           Full             View                Configurable   Assigned-project   Limited delivery    No               Payment context    Manage vendors  No
  management       administration                                      view               context                                                                 

  Reports and      Full             Organisation-wide   Configurable   Assigned-project   Assigned-site       Design/project   Finance reports    Procurement     Own
  dashboards       administration                                      reports            reports             reports                             reports         attendance
                                                                                                                                                                  summary only

  Audit logs       Full             View if granted     No by default  No                 No                  No               No                 No              No

  Organisation     Full             View or approve     No by default  No                 No                  No               No                 No              No
  settings                          selected settings                                                                                                             
  ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------

**Interpretation:** "Full administration" means managing the relevant
module's configuration and access where appropriate; it does not bypass
record-level restrictions, audit requirements, legal controls, or
business approval workflows.

## 7. Mandatory access restrictions

### 7.1 Workers and contractors

Worker and contractor accounts must be restricted to the attendance
experience.

They may: - Sign in using their assigned account. - Check in and check
out. - Submit required selfie or other configured attendance
verification. - Provide permitted site/location information. - View
their own attendance history and status. - Submit an attendance
correction request if enabled.

They must not: - View CRM, customers, quotations, BOQs, project budgets,
finance, vendor records, procurement, inventory, internal documents, or
management dashboards. - View another worker's attendance or personal
information. - Edit or approve their own verified attendance records. -
Access other modules by changing URLs, API requests, or client-side
state.

The restriction must be enforced by the backend API and database access
rules, not merely by hiding navigation items in the frontend.

### 7.2 Project-scoped users

Project Managers, Site Engineers, and Designers should normally be
limited to assigned projects and sites. Assignment changes must take
effect promptly.

A user must not gain access to a project merely by guessing its
identifier or URL.

### 7.3 Finance confidentiality

Finance permissions must be separately configurable. Project delivery
access must not automatically expose salaries, bank details,
company-wide cash positions, vendor payment records, or other restricted
financial information.

## 8. Business approvals and separation of duties

Application administration and commercial authority are separate
concepts.

### 8.1 Quotation approval

-   Every official quotation must receive the required owner/management
    approval before dispatch to the client.
-   Approval applies to a specific quotation version.
-   Material changes create a new version and require reapproval.
-   Super Admin may administer users and permissions but does not gain
    quotation approval authority solely by being Super Admin.

### 8.2 Design approval

-   The design workflow must support internal owner approval followed by
    client approval.
-   Revisions must be retained.
-   Only the client-approved design version may be marked ready for
    execution.
-   Design approval permissions must be granted independently of system
    administration.

### 8.3 Purchase approvals

-   Approval thresholds and approver routing are not yet final.
-   The system must support configurable monetary thresholds,
    project-level rules, category-based rules, and escalation.
-   Small purchases may be delegated to authorised project or
    procurement roles.
-   Larger purchases may require owner/management approval.
-   The Super Admin can configure the workflow only if granted the
    relevant configuration permission; they do not automatically become
    the commercial approver.

### 8.4 Two-owner configuration

AIW has two owners/management users. The system must not assume they
have identical authority or that either can approve every transaction.

The approval engine should support: - One or more eligible approvers. -
Sequential or parallel approval. - Required number of approvals. -
Delegation with start/end dates. - Conflict-of-interest and
self-approval restrictions where configured. - Escalation and substitute
approvers. - Version-specific approval records.

The exact owner hierarchy and dual-approval rules remain to be confirmed
by AIW.

## 9. User administration workflows

### 9.1 Add a new user

1.  Super Admin opens User Management.
2.  Creates or invites the user.
3.  Enters required profile information.
4.  Selects employment category, department, and designation.
5.  Assigns one or more configurable roles.
6.  Assigns project/site scope where applicable.
7.  Configures account status and authentication requirements.
8.  Sends invitation or activates the account.
9.  System records the administrator, timestamp, and changes in the
    audit log.

### 9.2 Change role or department

1.  Super Admin selects the user.
2.  Updates department, designation, role, or project assignment.
3.  Reviews the effective permissions.
4.  Confirms the change.
5.  System applies the updated permissions and records before/after
    values in the audit log.

### 9.3 Deactivate a user

1.  Super Admin deactivates the account.
2.  Active sessions and refresh tokens are revoked.
3.  The user can no longer authenticate or call protected APIs.
4.  Historical records remain intact and retain attribution to the
    original user.
5.  Open tasks and approvals can be reassigned.
6.  Attendance and payroll history remain available to authorised roles.

### 9.4 Reactivate a user

1.  Super Admin reviews the user's current employment status.
2.  Reconfirms role, department, and project/site assignments.
3.  Reactivates the account.
4.  User receives access only to the newly confirmed permissions.
5.  System records the reactivation.

## 10. Data model requirements

The database design should support, at minimum, the following logical
entities. Final table names and relationships will be defined in
`DATABASE_SCHEMA.md`.

  Entity                  Purpose
  ----------------------- ----------------------------------------------------
  Organisation / Tenant   Customer organisation boundary
  User                    Login identity and account status
  Employee Profile        Workforce-specific profile details
  Department              Configurable organisation departments
  Designation             Configurable job titles
  Employment Type         Employee, worker, contractor, and other categories
  Role                    Named permission bundle
  Permission              Atomic action on a module/resource
  Role Permission         Permissions granted to a role
  User Role               Role assignments to users
  Project Membership      User-to-project/site assignments
  Approval Policy         Configurable business approval rules
  Approval Assignment     Approver routing and delegation
  Audit Log               Trace of administrative and sensitive actions
  Invitation              Pending user onboarding

All tenant-owned records must be associated with an organisation/tenant
identifier. Unique constraints and access checks must be tenant-aware.

A user may hold multiple roles where permitted. The
permission-resolution strategy must be explicit and tested. Deny rules
and sensitive restrictions (especially attendance-only access) must not
be accidentally overridden by a broad role grant.

## 11. Security and audit requirements

-   Enforce authorisation on the server for every protected operation.
-   Apply tenant isolation to every tenant-owned query and mutation.
-   Use secure authentication, session expiry, and revocation.
-   Require stronger authentication for privileged accounts where
    supported.
-   Do not allow users to elevate their own roles or permissions.
-   Log role changes, permission changes, account status changes,
    exports, approvals, and sensitive record access where appropriate.
-   Audit entries should include actor, action, target, timestamp,
    organisation, and relevant before/after values.
-   Protect audit logs from ordinary modification or deletion.
-   Review privileged access periodically.
-   Do not expose secrets, passwords, biometric templates, or sensitive
    authentication data in logs.
-   Apply rate limiting and monitoring to authentication and
    administrative endpoints.

## 12. Attendance privacy and biometric controls

Attendance may involve selfies, location data, and potentially face
verification. These are sensitive personal data and require a separate
product, legal, and provider review before production use.

Before enabling biometric identity verification: - Establish an
appropriate legal basis and provide clear notice. - Obtain consent where
required. - Provide a practical non-biometric or supervisor-assisted
fallback. - Evaluate liveness and spoof-resistance claims. - Minimise
raw image and biometric-template retention. - Encrypt data in transit
and at rest. - Restrict access to attendance evidence. - Define
retention and deletion schedules. - Review vendor security, data
location, subprocessors, and deletion capabilities.

A Super Admin may manage attendance-user enrolment and access, but
should not receive unrestricted access to raw biometric data by default.

## 13. Future SaaS readiness

AIW OS is initially for AIW, but the architecture must be tenant-ready.

-   Each customer organisation has its own Organisation Super Admin.
-   Users, departments, designations, roles, projects, and records
    belong to one tenant.
-   Tenant data must be isolated at the application and database layers.
-   Platform Super Admin and Organisation Super Admin must be separate
    roles and security boundaries.
-   A user from one tenant must never access another tenant's records
    unless an explicit, audited platform support mechanism permits it.
-   Tenant-specific configuration must not require a code deployment.
-   Avoid AIW-specific assumptions in shared application logic.

## 14. Acceptance criteria

The RBAC implementation is acceptable when:

1.  Super Admin can add, edit, deactivate, and reactivate users without
    code changes.
2.  The organisation can add departments, designations, and custom roles
    dynamically.
3.  The system has no hardcoded employee or department count.
4.  A user can hold configurable roles and project assignments.
5.  Role and permission changes take effect on protected backend
    operations.
6.  Deactivated users lose access while historical records remain
    intact.
7.  Workers and contractors can access attendance only, including
    through direct API attempts.
8.  Project-scoped users cannot access unassigned projects by
    manipulating URLs or identifiers.
9.  Super Admin administration does not automatically grant commercial
    approval authority.
10. Quotation, design, and purchase approvals follow separately
    configured approval policies.
11. Administrative and sensitive actions are recorded in audit logs.
12. Tenant isolation is designed and tested before enabling multiple
    customer organisations.

## 15. Open decisions

The following items require AIW confirmation before production
configuration:

-   Who will hold the initial Organisation Super Admin account?
-   Will AIW appoint a backup Super Admin?
-   Which actions require two-owner approval?
-   What are the monetary thresholds for purchase approvals?
-   Can Project Managers approve any purchase categories or amounts?
-   Which finance reports can Project Managers view?
-   Who can correct attendance records, and who approves corrections?
-   What are the attendance retention periods and fallback procedures?
-   Which authentication and biometric verification providers, if any,
    will be used?
-   What is the process for emergency access and privileged-account
    recovery?

------------------------------------------------------------------------

**Document control:** This is a proposed RBAC baseline for review. The
current workforce counts are illustrative planning data only. Final role
assignments, approval authorities, privacy controls, and statutory
requirements must be confirmed by AIW before production rollout.
