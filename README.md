# Secure Notes API

REST API for a note-taking application with JWT authentication, role-based access control (RBAC), pagination and two MongoDB aggregation views.

**Stack:** Node.js 22 · Express · MongoDB · Mongoose · JWT · bcrypt · Zod

The companion frontend is in [`frontend-job-task`](https://github.com/arifkhan1990/frontend-job-task).

---

## Features

- JWT authentication with issuer/audience validation and a 1-hour expiry.
- Password hashing with bcrypt (configurable cost, default 12).
- Two roles: `user` and `admin`, enforced at the route and query level.
- Notes CRUD with strict ownership rules.
- Admin user management: create, list, update and delete users.
- Admin can read every note; regular users only see their own.
- Pagination on every list endpoint (`page`, `limit`, `meta`).
- Public per-user posts view built with a single `$lookup` pipeline.
- Admin interests view built with a single `$group`/`$unwind` pipeline.
- Request validation, rate limiting, Helmet, CORS allowlist and centralised error handling.
- OpenAPI 3 specification served with Swagger UI.
- Structured logs, audit events, optional Sentry and health/readiness checks.
- Integration tests against a real MongoDB replica set.
- Dockerfile and Docker Compose setup for a local production-like run.

---

## Roles and permissions

| Capability | User | Admin |
| --- | :---: | :---: |
| Register / login | ✅ | ✅ |
| Read / update own profile | ✅ | ✅ |
| Create, read, update, delete own notes | ✅ | ✅ |
| List own notes | ✅ | ✅ |
| Read every user's notes | ❌ | ✅ |
| Create / list / update / delete users | ❌ | ✅ |
| View users grouped by interests | ❌ | ✅ |
| Create posts | ✅ | ✅ |
| Read any user's posts (public) | ✅ | ✅ |

An admin inherits the normal user capabilities. Admins can **read** other users' notes but cannot edit or delete them; those actions remain owner-only.

---

## Project structure

```text
src/
  app.js                 Express app (no listening side effects)
  server.js              HTTP server, database connection and graceful shutdown
  config/                Environment, database, logger and Sentry setup
  models/                User, Note, Post schemas and indexes
  middleware/            Auth, RBAC, validation, rate limits, errors
  modules/
    auth/                Register, login, profile, JWT issuance
    users/               Admin user management, repository, interests and posts views
    notes/               Note CRUD, ownership rules and repository
    posts/               Post creation and repository
  routes/                API router
  utils/                 JWT, pagination, API errors, transactions, audit
migrations/              migrate-mongo index synchronization
scripts/seedAdmin.js     Creates or promotes an admin from environment variables
docs/                    Backup/restore, observability and query-plan evidence
src/docs/                OpenAPI 3 spec and Swagger UI mount
tests/                   Integration tests (Vitest + Supertest)
```

---

## Getting started

### Prerequisites

- Node.js 20 or newer
- MongoDB 6 or newer configured as a **single-node replica set** (required for transactions)
- npm

The simplest local MongoDB is the Compose service:

```bash
docker compose up -d mongo
```

If you run `mongod` directly, start it with `--replSet rs0` and run `rs.initiate()` once.

### Local setup

```bash
cp .env.example .env
npm install
```

Generate a real JWT secret and put it in `.env`:

```bash
openssl rand -hex 32
```

Set `MONGODB_URI` in `.env`, then create the first admin:

```bash
npm run seed:admin
npm run dev
```

The API listens on `http://localhost:5000` by default. Liveness is `GET /health`; readiness is `GET /ready`.

Useful commands:

```bash
npm run dev           # watch mode
npm start             # production start
npm run migrate:up    # apply index migrations
npm run migrate:status
npm run migrate:down  # revert model-defined indexes (destructive)
npm run seed:admin    # create/promote admin
npm run explain       # seed a scratch DB and print EXPLAIN plans
npm run lint          # ESLint
npm test              # unit + integration tests
npm run check         # lint + tests
npm run verify        # rules-kit gate: hygiene, install, lint, tests, audit
```

API documentation is available at `http://localhost:5000/api/docs` (Swagger UI) and the raw spec at `http://localhost:5000/api/openapi.yaml`.

In development and tests, Mongoose auto-builds indexes. In production, `AUTO_INDEX=false` and the deployment runs `npm run migrate:up` before the API starts; the migration uses the model definitions as the source of truth.

### Environment variables

| Variable | Required | Default | Purpose |
| --- | :---: | --- | --- |
| `MONGODB_URI` | ✅ | — | MongoDB connection string |
| `JWT_SECRET` | ✅ | — | HS256 signing key, at least 32 characters |
| `PORT` |  | `5000` | HTTP port |
| `NODE_ENV` |  | `development` | `development`, `test` or `production` |
| `JWT_EXPIRES_IN` |  | `1h` | JWT lifetime |
| `JWT_ISSUER` |  | `notes-api` | Verified `iss` claim |
| `JWT_AUDIENCE` |  | `notes-client` | Verified `aud` claim |
| `CORS_ORIGIN` |  | `http://localhost:5173` | Comma-separated allowed origins |
| `BCRYPT_ROUNDS` |  | `12` | bcrypt cost factor |
| `LOG_LEVEL` |  | `info` | Pino log level (`silent` in tests) |
| `AUTO_INDEX` |  | `true` in dev/test, `false` in production | Mongoose index auto-build |
| `SENTRY_DSN` |  | empty | Optional error tracking |
| `ADMIN_NAME` |  | `Administrator` | Seed script only |
| `ADMIN_EMAIL` |  | — | Seed script only |
| `ADMIN_PASSWORD` |  | — | Seed script only |
| `ADMIN_RESET_PASSWORD` |  | `false` | Set `true` to reset an existing admin password |

`ADMIN_RESET_PASSWORD=true` makes the seed script re-hash the supplied password. Without it, an existing admin is only promoted to the admin role.

---

## API

Base URL: `http://localhost:5000/api/v1`

All protected routes expect a JWT:

```http
Authorization: Bearer <token>
```

Login and registration return the token in the JSON response. The SPA keeps it in memory/session storage; it is not set as a cookie.

### Auth

| Method | Path | Access | Body / notes |
| --- | --- | --- | --- |
| `POST` | `/auth/register` | Public | `name`, `email`, `password`, `interests[]`; returns a JWT |
| `POST` | `/auth/login` | Public | `email`, `password`; returns a JWT |
| `GET` | `/auth/me` | Authenticated | — |
| `PATCH` | `/auth/me` | Authenticated | `name?`, `interests?`, `password?` |

Registration always creates a `user`; the `role` field cannot be escalated through the public endpoint.

The token contains only `sub` and `role`. It expires after 1 hour; the client must log in again after expiry.

### Users (admin)

| Method | Path | Access | Notes |
| --- | --- | --- | --- |
| `GET` | `/users` | Admin | Paginated list, newest first |
| `POST` | `/users` | Admin | `name`, `email`, `password`, `role?`, `interests?` |
| `GET` | `/users/:id` | Admin | Single user |
| `PATCH` | `/users/:id` | Admin | Partial update |
| `DELETE` | `/users/:id` | Admin | Deletes the user's notes and posts too |
| `POST` | `/users/bulk-delete` | Admin | Deletes up to 100 users and their content |
| `GET` | `/users/grouped-by-interests` | Admin | Aggregation view, paginated groups |
| `GET` | `/users/:id/posts` | Public | `$lookup` view, paginated posts |

The grouped-interests endpoint accepts optional `?interest=chess` to filter before grouping.

### Notes

| Method | Path | Access | Notes |
| --- | --- | --- | --- |
| `GET` | `/notes` | Authenticated | Users see their own; admins see all |
| `POST` | `/notes` | Authenticated | `title`, `content` |
| `GET` | `/notes/:id` | Owner or admin | Admins can read any note |
| `PATCH` | `/notes/:id` | Owner | Admins cannot edit other users' notes |
| `DELETE` | `/notes/:id` | Owner | Admins cannot delete other users' notes |

Admins can pass `?ownerId=<userId>` to filter the all-notes view. Regular users cannot use it to read another user's notes; the filter is ignored for them.

### Posts

| Method | Path | Access | Notes |
| --- | --- | --- | --- |
| `POST` | `/posts` | Authenticated | `title`, `content` |

Posts are read through `GET /users/:id/posts`. There is no separate all-posts feed, so no extra posts index is required.

### Pagination contract

Every list endpoint accepts:

```text
?page=1&limit=20
```

- `page` default `1`, minimum `1`
- `limit` default `20`, minimum `1`, maximum `100`

Response shape:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 42,
    "pages": 3
  }
}
```

Single-resource responses use `{ "data": { ... } }`. Validation failures use:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [{ "path": "email", "message": "Enter a valid email" }]
  }
}
```

### Example requests

Register:

```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Alice","email":"alice@example.com","password":"Password123!","interests":["chess","reading"]}'
```

Login and store the JWT:

```bash
TOKEN=$(curl -s -X POST http://localhost:5000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"alice@example.com","password":"Password123!"}' \
  | node -pe 'JSON.parse(require("fs").readFileSync(0)).data.token')
```

Create and list notes:

```bash
curl -X POST http://localhost:5000/api/v1/notes \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"title":"First note","content":"Hello"}'

curl "http://localhost:5000/api/v1/notes?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

Public posts view:

```bash
curl "http://localhost:5000/api/v1/users/<userId>/posts?page=1&limit=10"
```

---

## Index strategy

Indexes are declared with `schema.index()` in `src/models/` so they are visible during review.

| Collection | Index | Query it supports |
| --- | --- | --- |
| `users` | `{ email: 1 }` unique | Login lookup and registration uniqueness |
| `users` | `{ createdAt: -1, _id: -1 }` | Admin user list, newest first, with a stable tie-breaker |
| `users` | `{ interests: 1 }` multikey | Equality filters on `interests` used by the grouping view |
| `notes` | `{ owner: 1, createdAt: -1, _id: -1 }` | A user's note list; admin filtering by owner |
| `notes` | `{ createdAt: -1, _id: -1 }` | Admin all-notes list |
| `posts` | `{ author: 1, createdAt: -1, _id: -1 }` | `$lookup` author match plus inner post sort |

These are the **six** domain indexes. No refresh-token, role, text-search or all-posts index exists.

### Why these indexes

- **`users.email`** is the login lookup key and must be unique. It also protects concurrent registrations.
- **`users.createdAt + _id`** follows the admin list sort exactly. The `_id` part keeps ordering stable when two users share a timestamp.
- **`notes.owner + createdAt + _id`** follows the equality-sort-tiebreaker pattern. A user's list filters by `owner` and sorts by newest first. The same index serves an admin filtering by owner.
- **`notes.createdAt + _id`** supports the admin view that spans all owners.
- **`posts.author + createdAt + _id`** is the foreign-field index used by `$lookup`. It also supports the inner sort.
- **`users.interests`** is a multikey index used by the optional `?interest=` equality filter before `$unwind`.

### What is deliberately not indexed

- **GET by `_id`**: MongoDB's automatic `_id` index already supports `GET /users/:id` and `GET /notes/:id`.
- **`role`**: the only role query is a rare admin-count check during user updates/deletes. A role index would add write cost for a low-frequency guard.
- **Note title/content**: there is no text-search endpoint.
- **All-posts feed**: posts are only read per user, so no `{ createdAt: -1 }` index is needed on `posts`.

The interests aggregation is a blocking `$group`. No index can return pre-grouped results; the multikey index is there for the equality filter, and the grouping scan is expected. Adding more indexes would not remove that stage.

---

## Aggregation views

### 1. Users grouped by interests

`GET /api/v1/users/grouped-by-interests`

One `User.aggregate()` call, one collection, no `find()` or `countDocuments()`:

```js
const [result] = await User.aggregate([
  // Optional when ?interest=... is supplied; uses the multikey interests index.
  { $match: { interests: interest } },
  { $unwind: '$interests' },
  {
    $group: {
      _id: '$interests',
      userCount: { $sum: 1 },
      users: { $push: { _id: '$_id', name: '$name' } },
    },
  },
  { $sort: { _id: 1 } },
  { $project: { _id: 0, interest: '$_id', userCount: 1, users: 1 } },
  {
    $facet: {
      data: [{ $skip: skip }, { $limit: limit }],
      meta: [{ $count: 'total' }],
    },
  },
]);
```

`$facet` produces both the current page of interest groups and the total group count inside the same pipeline.

A user with `['chess', 'reading']` appears once in each group. Interests are trimmed, lowercased and deduplicated by the model before saving.

### 2. Posts by user (`$lookup`)

`GET /api/v1/users/:id/posts`

One `User.aggregate()` call with exactly one `$lookup`:

```js
const [result] = await User.aggregate([
  { $match: { _id: userId } },
  {
    $lookup: {
      from: 'posts',
      localField: '_id',
      foreignField: 'author',
      pipeline: [
        { $sort: { createdAt: -1, _id: -1 } },
        {
          $facet: {
            data: [{ $skip: skip }, { $limit: limit }],
            meta: [{ $count: 'total' }],
          },
        },
      ],
      as: 'postPage',
    },
  },
  { $project: { _id: 1, name: 1, page: { $arrayElemAt: ['$postPage', 0] } } },
  {
    $project: {
      _id: 1,
      name: 1,
      posts: { $ifNull: ['$page.data', []] },
      totalPosts: { $ifNull: [{ $arrayElemAt: ['$page.meta.total', 0] }, 0] },
    },
  },
]);
```

The lookup uses the `posts.author` portion of the compound index. The inner `$sort` uses `createdAt` and `_id`. `$facet` keeps only the requested page in the lookup result.

---

## Operations

### Migrations

Models are the single source of truth for index definitions. `migrations/20260101000000-sync-indexes.js` calls `syncIndexes()` for every model, so production can disable `autoIndex` and apply indexes deliberately:

```bash
npm run migrate:up
npm run migrate:status
```

`migrate:down` drops the model-defined indexes; it is destructive and should only be used in a controlled rollback.

### Health and logs

- `GET /health` — liveness, version and uptime.
- `GET /ready` — MongoDB ping; `503` when the database is unavailable.
- Every request gets an `x-request-id`; logs are JSON and redact authorization headers, password fields and token fields.
- Audit events (`audit: true`) record register/login/profile updates and admin user create/update/delete without secrets.
- Set `SENTRY_DSN` to enable optional Sentry error tracking.

See [`docs/observability.md`](docs/observability.md).

### Backups

See [`docs/backup-restore.md`](docs/backup-restore.md) for encrypted `mongodump`/`mongorestore` commands, retention and restore drills.

### Query plans

See [`docs/performance.md`](docs/performance.md) for the reproducible `EXPLAIN` results and index interpretation.

---

## Security notes

- Passwords are hashed with bcrypt at cost 12 by default. The hash is `select: false` and is removed by the JSON transform, so it never appears in a response.
- Passwords longer than 72 bytes are rejected at validation; bcrypt does not use bytes beyond that limit.
- JWTs use HS256, a required 32+ character secret, a 1-hour expiry, and verified `issuer`/`audience` claims.
- The token contains only `sub` and `role`. The account is re-fetched on every authenticated request, so deleting a user or changing a role takes effect immediately.
- Login/register are rate-limited separately from the general API. Limits apply in production; development and tests skip them so local reloads are not throttled.
- Helmet sets security headers, CORS uses an explicit allowlist, and JSON bodies are capped at 100 KB.
- Zod validates bodies, query strings and route parameters before they reach a service.
- Ownership checks return `404` for another user's note rather than revealing that it exists.
- Admins cannot delete their own account or change their own role. The service also blocks demoting or deleting the last admin.
- A password or role change does not revoke an already-issued JWT; the token remains valid until its 1-hour expiry. This is the deliberate trade-off for a single-token design.
- Secrets are read from environment variables and are never committed.

---

## Tests

```bash
npm test
```

The suite uses Vitest and Supertest against a real MongoDB replica set, plus unit tests for pure logic and service edge cases. It covers:

- Registration, login, duplicate emails, token failures and profile updates.
- Password hashing and hash non-disclosure.
- Health and readiness endpoints.
- Admin-only route protection.
- User CRUD, bulk delete and cascade deletion of notes/posts.
- Note ownership isolation and admin read access.
- Pagination metadata and page boundaries.
- The exact six-index inventory for each model.
- The interests aggregation (including a spy that asserts a single `aggregate()` call).
- The posts `$lookup` aggregation (single `$lookup`, sorted and paginated).
- Unit coverage for pagination and auth-service login/registration branches.

Tests use `MONGODB_URI_TEST` when set, otherwise `mongodb://127.0.0.1:27017/notes_api_test?replicaSet=rs0`. The GitHub Actions workflow starts a MongoDB 7 single-node replica set, initiates it, runs the repo-hygiene check, applies migrations, runs lint/tests and runs `npm audit --omit=dev --audit-level=high`.

`npm run verify` runs the same gate locally: repo hygiene, `npm ci`, lint, tests and the production dependency audit.

---

## Docker

```bash
export JWT_SECRET=$(openssl rand -hex 32)
export ADMIN_EMAIL=admin@example.com
export ADMIN_PASSWORD='change-this-password'

docker compose up -d --build
docker compose exec api node scripts/seedAdmin.js
```

The Compose stack starts MongoDB as a single-node replica set, waits for it to become healthy, then runs `npm run migrate:up` before starting the API. The API is available at `http://localhost:5000`; liveness is `GET /health` and readiness is `GET /ready`.

Set `CORS_ORIGIN` to the frontend origin when running the two containers together. No cookie or CSRF configuration is required in this variant.

The production image/release flow is documented in [`deploy/README.md`](deploy/README.md). The release workflow publishes `ghcr.io/arifkhan1990/backend-job-task` on `v*` tags; the deploy job is opt-in via repository variables and secrets.

## Production

The **`main`** branch is deployed at **https://notes-api.nabasolution.tech**. It currently serves the single-JWT strict-PDF variant: PR #3 merged `strict-pdf` into `main`. Pushes to `main` auto-deploy through the self-hosted srv host; the container runs `npm run migrate:up` before starting.

The **`strict-pdf`** branch is the assessment snapshot of the same code and is not separately deployed. The earlier refresh-token/CSRF implementation is preserved in git history at `3946458` as the stronger security alternative.

---

## Design decisions and trade-offs

- **Single JWT, no refresh token.** The token lives for 1 hour; the client logs in again after expiry. Password/role changes do not revoke an already-issued token before expiry. This is the current `main`/`strict-pdf` design. Before PR #3, `main` used rotating refresh tokens and CSRF; that variant is preserved in git history as the stronger revocation alternative.
- **Offset pagination.** It is simple and gives page numbers. Very deep pages still pay a `skip` cost; cursor pagination on `_id` would be the next step for large datasets.
- **Transactions require a replica set.** User update/delete and bulk delete are transactional. The Compose and CI environments use a single-node replica set; a standalone local `mongod` will reject transactions.
- **Admin can read but not mutate other users' notes.** This matches the permission table: admins manage users and view everyone's notes, while note mutation stays with the owner.
- **Grouped interests returns the full member list per group.** Pagination is at the group level. At large scale, member lists would be capped or paginated separately.
