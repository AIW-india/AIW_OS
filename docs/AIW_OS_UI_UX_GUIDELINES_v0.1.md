# AIW OS --- UI/UX Guidelines

**Document ID:** AIW-OS-UX-001 \| **Version:** 0.1 \| **Status:** Draft
design baseline \| **Date:** 25 November 2026

## 1. Experience goals

AIW OS must feel like a coherent, professional operations product rather
than a collection of unrelated admin screens. It must be fast to
understand, usable by office staff, and practical on mobile browsers at
construction sites.

Priorities: - Clear information hierarchy and predictable navigation. -
Task-focused dashboards rather than decorative analytics. - Fast entry
of site and procurement updates. - Visible status, ownership, deadlines,
blockers, and next actions. - Strong accessibility and responsive
behaviour. - Different experiences for management, office, project/site
teams, and attendance-only workforce.

## 2. User experience principles

1.  **Role-aware, not role-fragmented:** Shared design system;
    navigation and data visibility adapt to permissions.
2.  **Progressive disclosure:** Show essential information first;
    advanced detail appears when needed.
3.  **Action clarity:** Every workflow screen makes the next valid
    action obvious.
4.  **Status consistency:** Use a consistent status vocabulary and
    visual treatment.
5.  **Safe approvals:** Show exact version, amount, project, risks, and
    evidence before approval.
6.  **Field usability:** Large touch targets, concise forms,
    autosave/draft where safe, and resilient upload states.
7.  **No false security:** Hidden buttons improve usability but backend
    permissions remain authoritative.

## 3. Information architecture

Suggested primary navigation: - Overview - CRM - Projects - Estimation &
Quotations - Design - Procurement - Inventory (only when source of truth
is configured) - Workforce & Attendance - Finance - Quality -
Documents - Reports - Administration (Super Admin and permitted
administrators only)

Navigation items appear only when the user has the relevant permission.
Deep links must still be authorised by the backend.

## 4. Role-specific workspaces

### Owner / Management

-   Organisation dashboard: active projects, delayed milestones,
    approvals awaiting action, lead pipeline, cash/receivables/payables
    summaries, risk indicators.
-   Approval inbox for quotations, purchase approvals, design approvals,
    and escalations.
-   Drill-down from aggregate metrics to authorised source records.

### Organisation Super Admin

-   User lifecycle and invitations.
-   Departments, designations, roles, permission matrix, project access.
-   Organisation settings, integration health, audit logs.
-   No automatic access to commercial approval actions.

### Project Manager

-   Assigned project portfolio.
-   Milestones, tasks, overdue work, DPR review, material requests,
    design status, risks.
-   Project financial summary only where separately permitted.

### Site Engineer / Supervisor

-   Assigned site/project summary.
-   Today's tasks, DPR form, workforce attendance review if authorised,
    material receipt/usage updates, quality checklist, photo upload.
-   Mobile-first layout and low-friction evidence capture.

### Designer

-   Assigned design packages, revision timeline, review comments,
    approval status, document upload.
-   Clear distinction between draft, submitted, approved, and superseded
    designs.

### Accounts

-   Receivables, receipts, expenses awaiting review, vendor
    bills/payments, reconciliation and project cost views.
-   Restricted salary/bank/financial information based on permissions.

### Procurement

-   Material requests, vendor comparisons, purchase approval status,
    POs, delivery schedule, receipts, discrepancies.

### Worker / Contractor

-   Minimal attendance-only interface.
-   Check in / check out, verification status, today's assigned site if
    appropriate, own attendance history, correction request.
-   No global navigation or access to business modules.

## 5. Core screen patterns

-   **Dashboard:** KPI cards with definitions, date range, filters, and
    drill-down; avoid unexplained metrics.
-   **List pages:** Search, filters, sortable columns, pagination, saved
    filters where useful, clear empty/error/loading states.
-   **Detail pages:** Summary header, status, owner, timeline, tabs for
    activity/documents/tasks/financials as permitted.
-   **Forms:** Group fields by task, inline validation, clear required
    markers, preserve draft when safe.
-   **Approval pages:** Display version, totals, change summary,
    attachments, prior decisions, and explicit approve/reject with
    comment.
-   **Document viewer:** Version, uploader, date, status, download
    permission, and superseded warning.
-   **Audit view:** Actor, action, target, timestamp, and filtered
    before/after details.

## 6. Design system

-   Use a consistent spacing scale, typography scale, border radius,
    elevation, and icon set.
-   Use semantic tokens for primary, secondary, success, warning,
    danger, info, surface, and text colours.
-   Do not communicate state using colour alone; include labels/icons.
-   Maintain contrast meeting WCAG 2.2 AA where practical.
-   Use consistent button hierarchy: primary for main action, secondary
    for alternatives, destructive for irreversible actions.
-   Use reusable components for tables, status badges, dialogs, drawers,
    forms, date pickers, file upload, timelines, and approval panels.
-   Prefer shadcn/ui primitives with a documented theme layer; avoid ad
    hoc styling per module.

## 7. Responsive and field-use requirements

-   Desktop: dense operational tables and multi-panel workflows.
-   Tablet: responsive tables/cards and touch-friendly controls.
-   Mobile: single-column forms, compact navigation, sticky primary
    action where useful.
-   Minimum touch target approximately 44×44 CSS pixels.
-   Do not rely on hover for critical actions.
-   Upload progress, retry, and failure states must be clear.
-   Handle weak connectivity gracefully; do not claim an offline action
    succeeded until synchronised.
-   Attendance check-in/out must prevent accidental duplicate
    submissions and clearly display server-confirmed result.

## 8. Attendance UX and privacy

-   Explain what evidence is collected before capture.
-   Request camera/location permissions only at the relevant action.
-   Clearly distinguish captured, submitted, verified, failed, and
    pending states.
-   Provide a visible fallback path when verification fails or
    permissions are unavailable.
-   Avoid exposing another worker's personal details or attendance.
-   Do not show biometric confidence scores or sensitive provider
    diagnostics to unauthorised users.

## 9. Accessibility

-   Keyboard navigable controls and visible focus.
-   Semantic labels and accessible error messages.
-   Screen-reader-friendly status updates.
-   Adequate contrast and scalable text.
-   Do not rely only on colour, position, or icons.
-   Accessible tables and dialogs.
-   Support reduced motion preferences.

## 10. Content and microcopy

Use plain operational language. Prefer "Submit daily progress report"
over vague labels like "Update". Use consistent terms across screens and
documents. Show dates, currency, units, and timezone explicitly. Explain
why an action is blocked and what the user can do next.

## 11. UX states that every workflow must design

Loading; empty; partial data; validation error; permission denied;
network failure; save pending; save success; stale data/conflict;
approval pending; rejected; cancelled; integration failure; upload
retry; session expired.

## 12. UX deliverables before implementation

-   Sitemap and role-specific navigation.
-   Low-fidelity wireframes for core workflows.
-   High-fidelity design tokens and component library.
-   Desktop and mobile layouts for critical screens.
-   Click-through prototype for lead-to-project, quotation approval,
    DPR, material request, and attendance.
-   Accessibility review and usability testing with representative AIW
    users.

**Document control:** These are product-wide design rules. Exact brand
identity, colour palette, typography, and final screen layouts should be
established in the design system and prototype.
