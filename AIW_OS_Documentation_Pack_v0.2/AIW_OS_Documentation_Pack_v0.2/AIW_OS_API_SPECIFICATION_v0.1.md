# AIW OS --- API Specification

**Document ID:** AIW-OS-API-001 \| **Version:** 0.1 \| **Status:** Draft
contract baseline \| **Date:** 25 November 2026

## 1. API conventions

-   Base path: `/api/v1`.
-   HTTPS outside local development.
-   JSON request/response; UTF-8.
-   UUID identifiers.
-   Tenant context derived from authenticated session/token; never trust
    body/query `organisation_id`.
-   ISO-8601 timestamps; UTC in API.
-   Money represented as decimal strings to avoid JSON floating-point
    ambiguity, with explicit currency code.
-   List endpoints are paginated.
-   API errors use stable machine-readable codes.
-   OpenAPI 3.x should be maintained as implementation source of truth.

## 2. Authentication

Exact provider and token/session strategy TBD. Preferred browser
architecture should use secure session cookies where supported:
`HttpOnly`, `Secure`, appropriate `SameSite`, CSRF protection. If bearer
tokens are used for mobile/API clients, use short-lived access tokens
and protected refresh-token rotation.

Typical endpoints: \| Method \| Path \| Purpose \| \|---\|---\|---\| \|
POST \| `/auth/login` \| Authenticate \| \| POST \| `/auth/logout` \|
End session \| \| POST \| `/auth/refresh` \| Refresh session/token if
applicable \| \| GET \| `/auth/me` \| Current identity, organisation and
effective permissions \| \| POST \| `/auth/forgot-password` \| Start
account recovery \| \| POST \| `/auth/reset-password` \| Complete
account recovery \|

Never return password hashes, secrets, biometric templates, or internal
provider credentials.

## 3. Response conventions

### Success

``` json
{
  "data": {},
  "meta": {
    "requestId": "uuid"
  }
}
```

### Paginated list

``` json
{
  "data": [],
  "meta": {
    "page": 1,
    "pageSize": 25,
    "totalItems": 0,
    "totalPages": 0,
    "requestId": "uuid"
  }
}
```

### Error

``` json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have permission to perform this action.",
    "details": [],
    "requestId": "uuid"
  }
}
```

Suggested status codes: 200 success, 201 created, 202 accepted for async
work, 204 successful no-content, 400 invalid request, 401
unauthenticated, 403 unauthorised, 404 missing or intentionally
concealed resource, 409 conflict/state conflict, 422 semantic validation
error, 429 rate limited, 500 unexpected server error.

## 4. Common query conventions

-   `page` default 1; `pageSize` default 25; enforce maximum.
-   `sort` allowlisted fields only.
-   `order=asc|desc`.
-   Filters are explicitly defined per endpoint.
-   Search is scoped to tenant and caller's permitted records.
-   Exports are asynchronous for large datasets and audited.

## 5. Organisation and access endpoints

  Method      Path                              Permission intent
  ----------- --------------------------------- --------------------------------
  GET/POST    `/users`                          `users.view` / `users.create`
  GET/PATCH   `/users/{userId}`                 `users.view` / `users.edit`
  POST        `/users/{userId}/deactivate`      `users.deactivate`
  POST        `/users/{userId}/reactivate`      `users.reactivate`
  GET/POST    `/departments`                    `org.departments.view/create`
  GET/POST    `/designations`                   `org.designations.view/create`
  GET/POST    `/roles`                          `rbac.roles.view/create`
  PATCH       `/roles/{roleId}`                 `rbac.roles.edit`
  PUT         `/roles/{roleId}/permissions`     `rbac.permissions.manage`
  PUT         `/users/{userId}/roles`           `rbac.user_roles.manage`
  PUT         `/projects/{projectId}/members`   `projects.members.manage`
  GET         `/audit-logs`                     `audit.view`

All endpoints require tenant checks. Role changes cannot be used to
grant permissions beyond the actor's authority. Protected system roles
require special handling to prevent removal of the last active
Organisation Super Admin.

## 6. CRM endpoints

-   `GET/POST /leads`
-   `GET/PATCH /leads/{leadId}`
-   `POST /leads/{leadId}/interactions`
-   `POST /leads/{leadId}/assign`
-   `POST /leads/{leadId}/convert`
-   `GET/POST /customers`
-   `GET/PATCH /customers/{customerId}`

Validate stage transitions and ownership. Conversion must be idempotent
and prevent duplicate customer/project creation.

## 7. Estimation and quotation endpoints

-   `GET/POST /estimates`
-   `GET/PATCH /estimates/{estimateId}`
-   `POST /estimates/{estimateId}/items`
-   `POST /estimates/{estimateId}/revisions`
-   `GET/POST /quotations`
-   `GET /quotations/{quotationId}/versions`
-   `POST /quotations/{quotationId}/submit-approval`
-   `POST /quotation-versions/{versionId}/approve`
-   `POST /quotation-versions/{versionId}/reject`
-   `POST /quotation-versions/{versionId}/dispatch`
-   `GET /rate-catalogue`

Dispatch endpoint must verify approval of the exact version. Editing an
approved version must create a new version rather than mutating the
approved snapshot.

## 8. Project, task and design endpoints

-   `GET/POST /projects`
-   `GET/PATCH /projects/{projectId}`
-   `POST /projects/{projectId}/members`
-   `GET/POST /projects/{projectId}/tasks`
-   `PATCH /tasks/{taskId}`
-   `POST /tasks/{taskId}/comments`
-   `POST /projects/{projectId}/daily-progress-reports`
-   `POST /projects/{projectId}/design-packages`
-   `POST /design-packages/{packageId}/versions`
-   `POST /design-versions/{versionId}/submit`
-   `POST /design-versions/{versionId}/approve`
-   `POST /design-versions/{versionId}/reject`

All project resources must check membership or explicit
organisation-wide permission. Design approval must identify approval
stage and version.

## 9. Procurement and inventory endpoints

-   `GET/POST /vendors`
-   `GET/POST /material-requests`
-   `POST /material-requests/{requestId}/review`
-   `POST /material-requests/{requestId}/vendor-comparisons`
-   `POST /purchase-orders`
-   `POST /purchase-orders/{poId}/submit-approval`
-   `POST /purchase-orders/{poId}/approve`
-   `POST /purchase-orders/{poId}/reject`
-   `POST /purchase-orders/{poId}/goods-receipts`
-   `GET /integrations/odoo/status`
-   `POST /integrations/odoo/retry/{eventId}` (restricted)

Purchase endpoints must enforce approval policy. Odoo endpoints must be
idempotent and must not create a second editable inventory ledger.

## 10. Attendance endpoints

-   `POST /attendance/check-in`
-   `POST /attendance/check-out`
-   `GET /attendance/me`
-   `GET /attendance/me/summary`
-   `POST /attendance/correction-requests`
-   `GET /attendance/correction-requests` (authorised reviewers)
-   `POST /attendance/correction-requests/{requestId}/approve`
-   `POST /attendance/correction-requests/{requestId}/reject`

Worker/contractor access allowlist: own attendance and the minimum
profile/session operations required. Do not expose broad workforce
directories or other users' attendance. Server timestamps are
authoritative. Client timestamps may be retained only as diagnostic
metadata.

## 11. Finance endpoints

-   `GET/POST /expenses`
-   `GET/PATCH /expenses/{expenseId}`
-   `POST /expenses/{expenseId}/submit`
-   `POST /expenses/{expenseId}/approve`
-   `POST /expenses/{expenseId}/reject`
-   `GET/POST /client-receipts`
-   `GET/POST /vendor-bills`
-   `GET/POST /vendor-payments`
-   `GET /projects/{projectId}/financial-summary`
-   `POST /financial-adjustments`

All financial mutations require permission, validation, and audit. Do
not hard-delete posted financial transactions.

## 12. Documents and notifications

-   `POST /documents/upload-intent` returns a short-lived authorised
    upload target.
-   `POST /documents/{documentId}/complete-upload` verifies
    metadata/checksum and associates record.
-   `GET /documents/{documentId}/download` performs access check then
    issues short-lived signed URL.
-   `GET /notifications`
-   `POST /notifications/{notificationId}/read`
-   `GET/PATCH /notification-preferences`

Never accept arbitrary storage keys or public URLs from clients without
validation.

## 13. Idempotency, concurrency and workflow safety

-   Support `Idempotency-Key` for operations that may be retried (lead
    conversion, payment recording, dispatch, external integration
    events).
-   Use optimistic concurrency/version fields for editable business
    records.
-   Use database transactions for approval and state transitions.
-   Enforce unique version numbers and unique business numbers per
    tenant.
-   Prevent duplicate approval actions and duplicate payment posting.
-   Queue long-running exports and integration tasks; return 202 with
    job reference.

## 14. Security requirements

-   Authentication middleware on protected endpoints.
-   Permission + scope checks on every operation.
-   Tenant-scoped repository/query layer.
-   Input validation and output filtering.
-   Rate limiting on login, recovery, exports, and sensitive endpoints.
-   Audit sensitive actions.
-   Do not disclose whether a concealed cross-tenant resource exists.
-   File access via short-lived signed URLs only after authorisation.
-   Worker/contractor attendance-only restriction must be tested at API
    level.

## 15. OpenAPI and release process

Maintain an OpenAPI specification in source control. Every endpoint must
document authentication, permission, scope, request schema, response
schema, error codes, pagination, idempotency, and audit behaviour.
Breaking changes require API versioning or a documented compatibility
plan.

**Document control:** This is a route and behaviour baseline, not a
complete generated OpenAPI contract. Request/response schemas must be
completed alongside implementation.
