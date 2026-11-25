# AIW OS --- Security, Privacy and Data Governance Baseline

**Document ID:** AIW-OS-SEC-001 \| **Version:** 0.1 \| **Status:** Draft
\| **Date:** 25 November 2026

## 1. Purpose

This baseline defines minimum security and privacy controls for AIW OS.
It is an engineering baseline, not legal advice or a substitute for a
formal legal/privacy assessment.

## 2. Data classification

Suggested classes: - Public: approved public marketing information. -
Internal: routine operational information. - Confidential: customer
records, contracts, BOQs, project documents, vendor terms, financial
data. - Restricted: credentials, privileged access data, sensitive
personal information, attendance evidence, biometric verification
references, bank details.

Apply access, encryption, retention, export, and logging controls
according to classification.

## 3. Identity and access

-   Unique accounts; no shared administrator credentials.
-   MFA for privileged roles where supported.
-   Least privilege and deny-by-default.
-   Server-side RBAC and project/tenant scope enforcement.
-   Session expiry, rotation, revocation, and suspicious-login controls.
-   No self-role elevation.
-   Periodic privileged-access review.
-   Safe transfer/recovery process for the last active Organisation
    Super Admin.

## 4. Tenant isolation

-   Resolve tenant from authenticated identity.
-   Scope all reads, writes, exports, background jobs, and storage
    access.
-   Validate tenant ownership on every relationship.
-   Test cross-tenant access attempts continuously.
-   Separate SaaS Platform Super Admin from tenant Organisation Super
    Admin.
-   Support access by platform support staff only through explicit,
    time-limited, audited process where legally and contractually
    permitted.

## 5. Data protection

-   TLS in transit; encryption at rest for database, backups, and object
    storage.
-   Store secrets in a managed secret store or protected environment
    configuration.
-   Never commit secrets to source control.
-   Minimise collected personal data.
-   Define retention and deletion schedules per data class.
-   Restrict exports and log export activity.
-   Protect private documents with short-lived signed URLs after
    authorisation.
-   Keep development/test data synthetic or anonymised.

## 6. Attendance, location and biometrics

Attendance may involve selfie images, location information, and face
verification. Face detection is not identity verification; liveness is
an additional control and does not guarantee accuracy.

Before enabling biometric processing: - Complete legal/privacy review
for applicable Indian laws and rules, and any other relevant
jurisdiction. - Provide clear notice describing purpose, data,
retention, recipients, rights, and contact route. - Establish
appropriate lawful basis and obtain consent where required. - Provide a
workable non-biometric/supervisor-assisted alternative. - Evaluate
accuracy, bias, false acceptance/rejection, liveness/spoof resistance,
and failure handling. - Prefer provider-side verification that returns
minimal result/reference rather than retaining biometric templates. -
Avoid storing raw selfie images longer than operationally necessary. -
Encrypt evidence, tightly restrict access, and record access events. -
Define deletion/retention and vendor deletion verification. - Do not use
attendance biometrics for unrelated employee monitoring or profiling.

## 7. Financial and approval controls

-   Separate administration from business approval.
-   Approval records reference immutable document/transaction versions.
-   Enforce configurable limits and approver eligibility.
-   Preserve transaction history through reversal/adjustment.
-   Restrict salary, bank, vendor payment, and company-wide finance
    views.
-   Log approvals, rejections, edits, exports, and payment changes.

## 8. Application security

-   Validate all input and encode output.
-   Use parameterised database access.
-   Apply CSRF protection where relevant and secure cookie attributes.
-   Rate-limit authentication and sensitive endpoints.
-   Secure uploads with file type/size validation and malware scanning
    strategy.
-   Use least-privilege service/database credentials.
-   Patch dependencies and base images.
-   Perform code review and security testing before release.
-   Avoid sensitive details in application logs and error responses.

## 9. Incident response

Maintain an incident process with: 1. Detection and triage. 2.
Containment and credential/key revocation. 3. Impact and data-scope
assessment. 4. Evidence preservation. 5. Legal/customer/regulatory
notification assessment. 6. Recovery and validation. 7. Root-cause
analysis and corrective actions.

Define named incident owners and notification timelines before
production SaaS onboarding.

## 10. Vendor and integration review

Before connecting identity, biometric, WhatsApp, email, cloud, or Odoo
providers, review: - Data processed and purpose. - Hosting region and
subprocessors. - Encryption and access controls. - Retention/deletion
capabilities. - Incident notification commitments. - Availability and
support. - API security and credential scopes. - Contractual and
regulatory requirements.

## 11. Governance decisions

AIW must confirm data owners, retention periods, privacy notice,
attendance fallback, biometric provider, incident contacts, backup
retention, export policy, and legal review. This baseline should be
reviewed periodically and after material product changes.
