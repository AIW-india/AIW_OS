# AIW OS --- Test Plan

**Document ID:** AIW-OS-TEST-001 \| **Version:** 0.1 \| **Status:**
Draft \| **Date:** 25 November 2026

## 1. Objectives

Verify functional correctness, tenant isolation, RBAC, workflow
integrity, financial accuracy, privacy controls, usability, performance,
and operational recovery. P0 requirements must be tested before
production.

## 2. Test levels

-   Unit: domain calculations, permission resolution, state transitions,
    validators.
-   Integration: database repositories, transactions, storage, queues,
    provider adapters.
-   API: authentication, authorisation, validation, pagination,
    idempotency, error handling.
-   End-to-end: complete business journeys across modules.
-   Security: tenant isolation, privilege escalation, session
    revocation, file access, injection and abuse controls.
-   Performance: realistic concurrency, list/search, uploads,
    dashboards, and exports.
-   UAT: AIW owners, office/admin, PMs, site engineers, accounts,
    procurement, workforce representatives.
-   Operational: deployment, migration, backup/restore, monitoring and
    incident response.

## 3. Critical test matrix

  ----------------------------------------------------------------------------------------------
  ID                Scenario                        Expected result            Priority
  ----------------- ------------------------------- -------------------------- -----------------
  T-SEC-001         User A requests another         No data disclosure;        P0
                    tenant's project ID             request denied/concealed   

  T-SEC-002         User changes organisation ID in Server ignores/rejects;    P0
                    request body                    tenant context remains     
                                                    authenticated tenant       

  T-SEC-003         Worker calls                    Denied; no data returned   P0
                    CRM/finance/project APIs                                   
                    directly                                                   

  T-SEC-004         Worker requests another         Denied                     P0
                    worker's attendance                                        

  T-SEC-005         Deactivated user reuses active  Session/API access revoked P0
                    session                                                    

  T-SEC-006         User attempts to grant          Denied and audited         P0
                    themselves Super Admin                                     

  T-SEC-007         Project user guesses unassigned Denied                     P0
                    project URL                                                

  T-SEC-008         Unauthorised user requests      No access; signed URL not  P0
                    private document URL            issued                     

  T-RBAC-001        Super Admin adds a user beyond  User creation succeeds; no P0
                    initial 40-person snapshot      fixed-count error          

  T-RBAC-002        Super Admin creates             New entities usable        P0
                    department/designation/custom   without deployment         
                    role                                                       

  T-RBAC-003        Super Admin changes role        Effective permissions      P0
                    permissions                     update; audit record       
                                                    created                    

  T-RBAC-004        Last active Organisation Super  Prevent or require safe    P0
                    Admin is deactivated            transfer/recovery          

  T-CRM-001         Lead created and assigned with  Correct owner, stage and   P0
                    follow-up                       reminder stored            

  T-CRM-002         Won lead converted twice        No duplicate               P0
                                                    customer/project           

  T-QUO-001         Unapproved quotation dispatch   Blocked                    P0
                    attempted                                                  

  T-QUO-002         Approved quotation materially   New version created; new   P0
                    edited                          approval required          

  T-QUO-003         Approval references wrong       Rejected                   P0
                    version                                                    

  T-PRJ-001         Accepted quotation converted to Source quotation version   P0
                    project                         retained                   

  T-DES-001         Superseded design marked        Blocked                    P0
                    execution-ready                                            

  T-DPR-001         Site engineer submits           DPR stored and routed to   P0
                    assigned-project DPR            PM review                  

  T-PRO-001         PO created before required      Blocked                    P0
                    approval                                                   

  T-PRO-002         Duplicate integration event     Idempotent result; no      P0
                    received                        duplicate PO/receipt       

  T-INV-001         Odoo and AIW OS both attempt    Conflict/source-of-truth   P0 before
                    stock mutation                  controls prevent dual      integration
                                                    ledger                     

  T-ATT-001         Check-in/out                    Server timestamp stored;   P0
                                                    duplicate event controlled 

  T-ATT-002         GPS/camera permission           Clear fallback path; no    P0
                    unavailable                     false success              

  T-ATT-003         Attendance correction submitted Routed to authorised       P1
                                                    reviewer; audit maintained 

  T-FIN-001         Currency arithmetic with        Correct rounding and       P0
                    decimal values                  totals                     

  T-FIN-002         Posted expense edited/deleted   History preserved through  P0
                                                    controlled adjustment      

  T-FIN-003         Receipts incorrectly treated as Report separates receipts, P0
                    profit                          revenue/cost basis and     
                                                    margin                     

  T-DOC-001         Upload unsupported/oversized    Rejected safely with clear P0
                    file                            error                      

  T-NOT-001         Notification provider           Retry/status recorded;     P1
                    unavailable                     core transaction remains   
                                                    correct                    

  T-OPS-001         Database backup restored to     Restore verified and       P0 before
                    test environment                documented                 production
  ----------------------------------------------------------------------------------------------

## 4. End-to-end journeys

1.  Enquiry → qualification → site visit → estimate → quotation revision
    → owner approval → dispatch → won → project creation.
2.  Project assignment → task template → engineer update → DPR → PM
    review → owner dashboard.
3.  Design submission → internal approval → client approval → approved
    execution document.
4.  Material request → vendor comparison → approval → PO → delivery
    verification → receipt.
5.  Attendance check-in → check-out → exception/correction → authorised
    review.
6.  Expense submission → approval → project cost view.
7.  Client milestone receipt → receivable update → project financial
    summary.
8.  Contractor work completion → site verification → PM approval →
    payable record.
9.  User invitation → role assignment → project access → role change →
    deactivation → historical record retention.

## 5. Security testing

-   Horizontal privilege escalation across users/projects.
-   Vertical privilege escalation across roles.
-   Tenant identifier tampering.
-   IDOR on all resource identifiers.
-   Session fixation, token replay, refresh-token reuse,
    logout/deactivation revocation.
-   CSRF where cookie sessions are used.
-   Rate limiting and account recovery abuse.
-   File upload content-type spoofing, oversized files, malicious
    content scanning.
-   Sensitive data leakage in logs, exports, error messages, and
    notifications.
-   SQL injection and XSS controls.
-   Privileged action audit completeness.
-   Attendance evidence access and retention enforcement.

## 6. Financial and calculation testing

Use known test fixtures for: - Quantity × rate, wastage, labour/material
subtotals. - Discount, tax, overhead, margin and rounding order. -
Partial receipts and outstanding receivables. - Vendor advances, partial
payments, credit due dates. - Cost allocations across projects. - Budget
vs estimated vs actual vs committed vs forecast. - Reversal and
adjustment behaviour. Have an accountant validate statutory treatment
and report definitions.

## 7. Performance testing

Establish baselines before setting final service-level objectives.
Test: - Concurrent office and site users. - Dashboard aggregation. -
Filtered project/task/attendance lists. - Large BOQ documents and
exports. - Photo/document uploads. - Notification/job backlogs. -
Database connection saturation. Use realistic, anonymised data volumes.
Record p50/p95/p99 latency, error rate, throughput, CPU, memory, DB
query latency, and queue age.

## 8. UAT approach

Run task-based sessions with representatives of each role. Capture
completion time, errors, confusion, missing fields, and workarounds. UAT
must include workers/contractors using attendance-only access and site
engineers using mobile browsers. Business owners must sign off quotation
and purchase approval workflows; accounts must validate finance
definitions.

## 9. Entry and exit criteria

**Entry:** approved requirements for tested scope; stable test
environment; seeded test data; test accounts for roles/tenants;
migrations applied.

**Exit:** all P0 tests pass; no unresolved critical/high security
defects; financial calculations independently checked; tenant and
attendance-only restrictions verified; backup restore successful; UAT
blockers resolved or formally accepted; release notes and rollback plan
ready.

## 10. Defect severity

-   Critical: data leakage, unauthorised financial approval,
    cross-tenant access, data corruption.
-   High: core workflow blocked, incorrect financial totals, privilege
    escalation.
-   Medium: workaround available; limited module impact.
-   Low: cosmetic or minor usability issue.

## 11. Test data and privacy

Use synthetic or anonymised data. Do not use real biometric evidence,
personal contact data, or production financial records in
development/test environments unless a documented, approved process
requires it and appropriate safeguards are applied.

**Document control:** Test cases should be expanded into executable
automated tests and UAT scripts as each module is implemented.
