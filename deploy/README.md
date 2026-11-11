# Production deployment

Deployment uses the image published by `.github/workflows/release.yml` on a `v*` tag. The server never builds from the working directory and never receives `.ai`, `.opencode`, `AGENTS.md`, tests or local `.env` files.

## One-time server setup

1. Install Docker Engine and the Compose plugin.
2. Create `/opt/notes-api` and copy `deploy/docker-compose.prod.yml` there.
3. Create `/opt/notes-api/.env` with the production values:

```dotenv
JWT_SECRET=<32+ random characters>
JWT_EXPIRES_IN=1h
CORS_ORIGIN=https://notes.example.com
LOG_LEVEL=info
# SENTRY_DSN=
```

4. Log in to GHCR if the package is private:

```bash
echo "$GHCR_TOKEN" | docker login ghcr.io -u arifkhan1990 --password-stdin
```

## Release

Push a semantic tag from the backend repository:

```bash
git tag v1.1.0
git push origin v1.1.0
```

The release workflow builds and pushes `ghcr.io/arifkhan1990/backend-job-task:v1.1.0` and `:latest`.

## Deploy

The workflow's `deploy` job is disabled by default. Enable it with repository variable `ENABLE_DEPLOY=true`, `DEPLOY_PATH=/opt/notes-api`, and the `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY` secrets.

The job runs:

```bash
cd /opt/notes-api
docker compose -f deploy/docker-compose.prod.yml pull
docker compose -f deploy/docker-compose.prod.yml up -d
```

The API container runs `npm run migrate:up` before starting. `AUTO_INDEX=false` keeps index changes explicit. Check `GET /ready` after deploy.

## Rollback

Deploy the previous image tag by updating the image reference or re-running the release workflow for that tag. Keep the previous `.env` and MongoDB backup. Migrations must remain backward compatible (add first, remove later).
