# Backup and restore

MongoDB data lives in the `notes_api` database. Backups must be encrypted, stored outside the application server, and tested by restoring into a scratch database.

## Backup

Run from a host with `mongodump` installed and network access to the replica set:

```bash
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
mongodump \
  --uri "$MONGODB_URI" \
  --archive="/secure/backups/notes-api-${STAMP}.archive" \
  --gzip
```

Encrypt the archive before copying it off the host:

```bash
age -r "$BACKUP_PUBLIC_KEY" \
  -o "/secure/backups/notes-api-${STAMP}.archive.age" \
  "/secure/backups/notes-api-${STAMP}.archive"
rm "/secure/backups/notes-api-${STAMP}.archive"
```

With Docker Compose:

```bash
docker compose exec -T mongo mongodump \
  --uri "mongodb://127.0.0.1:27017/notes_api?replicaSet=rs0" \
  --archive --gzip > "notes-api-$(date -u +%Y%m%dT%H%M%SZ).archive.gz"
```

## Restore

Restore into a scratch database first and run the API test suite against it. Never restore directly over production without a verified backup of the current state.

```bash
mongorestore \
  --uri "$MONGODB_URI" \
  --archive="/secure/backups/notes-api-20260101T000000Z.archive" \
  --gzip \
  --drop \
  --nsFrom='notes_api.*' \
  --nsTo='notes_api_restore.*'
```

After verification, restore to the real namespace with `--nsFrom='notes_api_restore.*' --nsTo='notes_api.*'`.

## Schedule and retention

- Daily full backup at 02:00 UTC.
- Keep 7 daily, 4 weekly and 12 monthly archives.
- Store a copy in a different region/account.
- Alert if a backup job fails or the archive is smaller than the previous day's by more than 30%.
- Run a restore drill quarterly and record the result.

## Security

- Backups contain password hashes and user data. Encrypt at rest and in transit.
- Never commit archives, dumps or `.env` files to git.
- Restrict backup bucket access to the backup job identity only.
- Rotate backup encryption keys and document the rotation date.
