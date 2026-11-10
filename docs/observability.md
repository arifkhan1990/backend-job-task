# Observability

## Structured logs

The API uses `pino` with JSON logs. Every request gets an `x-request-id` header (incoming value reused when present, otherwise a UUID). Logs redact:

- `Authorization` and `Cookie` request headers
- `Set-Cookie` response headers
- password, token, access-token, refresh-token and CSRF fields

Example:

```json
{
  "level": 30,
  "time": 1760000000000,
  "service": "notes-api",
  "req": { "id": "7f9c...", "method": "POST", "url": "/api/v1/notes" },
  "res": { "statusCode": 201 },
  "msg": "POST /api/v1/notes 201"
}
```

## Audit events

Security-sensitive actions emit an `audit: true` event through the same logger:

- `auth.register`, `auth.login`, `auth.refresh`, `auth.refresh.reuse`, `auth.logout`
- `auth.profile.update`
- `user.create`, `user.update`, `user.delete`

Audit events include the actor id, target id, changed field names and role where relevant. They never include passwords, hashes or tokens.

## Health checks

- `GET /health` — liveness. Does not query the database.
- `GET /ready` — readiness. Pings MongoDB and returns `503` when the connection is down.

The Docker health check uses `/ready`.

## Error tracking

Set `SENTRY_DSN` to enable Sentry. The integration is optional; when the variable is empty, no Sentry client is initialized. `SENTRY_DSN` must never be committed.

## Log destinations

Ship JSON logs to the platform's log collector (Docker awslogs, Loki, CloudWatch, etc.). Do not write application logs to a file inside the container. Retain 30 days for normal logs and 180 days for audit events, subject to local policy.
