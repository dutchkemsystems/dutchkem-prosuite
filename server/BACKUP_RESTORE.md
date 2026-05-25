# Dutchkem Prosuite — Backup & Restore Procedures

## 1. Database (Convex)

### Backup

```bash
# 1a. Export full Convex deployment (requires convex CLI)
npx convex export --team <team-slug> --project <project-name> --output ./backups/convex-$(date -I)

# 1b. Or use Convex dashboard:
#    Settings → Export → Download snapshot (JSON)

# 1c. For specific tables only (faster):
npx convex run seed_migration:status --output ./backups/migration-status.json
```

### Restore

```bash
# 2a. Import from backup file
npx convex import --team <team-slug> --project <project-name> ./backups/convex-2026-05-23

# 2b. If restoring to a fresh deployment, run migrations after:
npx convex run seed_migration:run
```

> **WARNING**: Convex import replaces ALL data. Do not run against the production deployment
> without first verifying the backup on a staging deployment.

---

## 2. Environment Variables (`.env`)

### Backup

```bash
# Copy the ENTIRE server/ directory to a secure location
cp server/.env ./backups/.env.$(date -I).bak

# OR just the env file
cp server/.env ./backups/.env.backup
```

The `.env` file contains:
| Variable | Purpose |
|---|---|
| `JWT_SECRET_CLIENT` | Client access token signing |
| `JWT_SECRET_ADMIN` | Admin access token signing |
| `REFRESH_SECRET` | Refresh token signing |
| `RESEND_API_KEY` | Email alerts via Resend |
| `TERMII_API_KEY` | SMS via Termii |
| `NVIDIA_NIM_API_KEY` | AI model access |

### Restore

```bash
cp ./backups/.env.2026-05-23.bak server/.env
```

> **WARNING**: Never commit `.env` to git. The `.gitignore` already excludes it.
> If recovery secrets are lost, admins will be locked out. Store backup in a
> password manager (e.g. 1Password, Bitwarden).

---

## 3. Server Config & Code

### Backup

```bash
# Full project backup (excludes node_modules, dist, .env)
git archive --format=zip --output=./backups/dutchkem-$(date -I).zip HEAD

# Or just the server directory
tar -czf ./backups/server-$(date -I).tar.gz \
  --exclude=node_modules \
  --exclude=.env \
  server/
```

### Restore

```bash
# Clone fresh & restore env
git clone <repo-url> app
cp ./backups/.env.2026-05-23.bak app/server/.env
cd app && npm install && cd server && npm install
npx convex deploy  # Push Convex functions
```

---

## 4. Quick Recovery — Emergency Procedure

If the production server is down:

```bash
# 1. Clone and install
git clone <repo-url> /var/www/dutchkem
cd /var/www/dutchkem
npm install
cd server && npm install

# 2. Restore env
cp /secure/backup/location/.env.production server/.env

# 3. Deploy Convex functions
npx convex deploy

# 4. Start server
NODE_ENV=production node server/index.mjs

# 5. Run migration (idempotent — safe to re-run)
npx convex run seed_migration:run
```

---

## 5. Automated Backup Script

Save as `scripts/backup.sh` and run via cron:

```bash
#!/bin/bash
BACKUP_DIR="./backups/$(date -I)"
mkdir -p "$BACKUP_DIR"

# Convex export
npx convex export --output "$BACKUP_DIR/convex.json"

# Environment
cp server/.env "$BACKUP_DIR/.env.bak"

# Git archive
git archive --format=zip -o "$BACKUP_DIR/code.zip" HEAD

echo "Backup complete: $BACKUP_DIR"
```

### Cron (daily at 02:00)

```cron
0 2 * * * /path/to/dutchkem/scripts/backup.sh
```

---

## Important Notes

- **JWT secrets** — If lost, all existing tokens become invalid. Users must re-login.
- **Convex snapshots** — Only cover the database, NOT file uploads (manuscripts, covers, etc.).
- **File uploads** — Currently stored locally in `server/tmp/`. Back up separately if needed.
- **Rate limiter state** — In-memory only (Map). Lost on restart. Consider Redis for persistence
  in production.
