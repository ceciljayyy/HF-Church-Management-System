# API Documentation

## Versioning

All APIs are versioned under `/api/v1`.

## Main groups

- /api/v1/auth
- /api/v1/dashboard
- /api/v1/users
- /api/v1/roles
- /api/v1/permissions
- /api/v1/churches
- /api/v1/branches
- /api/v1/people
- /api/v1/members
- /api/v1/families
- /api/v1/groups
- /api/v1/events
- /api/v1/attendance
- /api/v1/kiosk
- /api/v1/finance
- /api/v1/reports
- /api/v1/communications
- /api/v1/pastoral-care
- /api/v1/first-timers
- /api/v1/media
- /api/v1/settings
- /api/v1/audit-logs

## Conventions

- `GET` for list/detail
- `POST` for create
- `PATCH` for partial update
- `DELETE` for archive/soft delete
- Pagination, search, and filters are supported on list endpoints
- Responses are JSON and typed

## Auth

- Login returns an HTTP-only session cookie or token-based session
- Protected endpoints validate the current user and permissions