# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [1.1.0] - 2026-11-10

### Added

- `/api/v1` versioned API and consistent `{ error: { code, message, details? } }` envelope.
- Repository layer between services and Mongoose models.
- 15-minute access JWT plus rotating, hashed refresh tokens in an `HttpOnly` cookie.
- Double-submit CSRF protection for refresh and logout.
- Refresh-token reuse detection and revoke-all on password/role changes and account deletion.
- Structured JSON logs with request IDs, redaction and audit events.
- Optional Sentry error tracking via `SENTRY_DSN`.
- `migrate-mongo` index migration and production `AUTO_INDEX=false` support.
- MongoDB transactions for registration, profile updates, refresh rotation and cascade deletes.
- `/health` and `/ready` endpoints.
- OpenAPI 3 spec, Swagger UI at `/api/docs`, and reproducible `EXPLAIN` evidence.
- Bulk user deletion for the admin DataTable, with self/last-admin protection and transaction-backed cascade.
- Unit tests for pagination, token utilities and auth service edge cases.
- `scripts/verify.sh`, `scripts/check-repo-hygiene.sh`, CI hygiene/audit checks and this changelog.
- Backup/restore, observability and query-plan documentation.

### Changed

- Local, Docker and CI MongoDB run as a single-node replica set.
- Tests now cover 37 integration/API cases plus 12 unit cases.

## [1.0.0] - 2026-11-10

### Added

- Initial secure notes API: users, notes, posts, JWT auth, RBAC, pagination and the two required aggregation views.
- Initial React client, Docker packaging, CI and 27 integration tests.
