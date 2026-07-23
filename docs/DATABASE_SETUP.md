# Database Setup (PostgreSQL + Prisma)

## Local (development)

1. Install PostgreSQL 16+ (`winget install PostgreSQL.PostgreSQL.17` on
   Windows; service `postgresql-x64-17` starts automatically).
2. Create the database: `psql -U postgres -c "CREATE DATABASE reef_commerce;"`
3. `.env`: `DATABASE_URL="postgresql://postgres:<password>@localhost:5432/reef_commerce"`

## Production (Neon)

Create a project at https://neon.tech, copy the pooled connection string
(includes `?sslmode=require`) into Vercel's `DATABASE_URL`. Supabase:
Project Settings → Database → connection string (use the pooler in
transaction mode for serverless).

## Prisma workflow

The schema lives in `prisma/schema.prisma`; the client is generated into
`src/generated/prisma` (committed, so builds don't depend on generate).

| Task | Command |
|---|---|
| Apply migrations + regenerate client (dev) | `npx prisma migrate dev` |
| Create a new migration after schema edits | `npx prisma migrate dev --name <what_changed>` |
| Apply committed migrations (production) | `npx prisma migrate deploy` |
| Regenerate client only | `npx prisma generate` |
| Seed the catalog + owner account | `npx prisma db seed` |
| Inspect data in a GUI | `npx prisma studio` |

Rules of thumb:
- Never edit an already-committed migration; create a new one.
- Production only ever runs `migrate deploy` — it applies, never generates.
- After `prisma generate`, **restart the dev server** — the running process
  keeps the old client in memory.

## Seed data

`prisma/seed.ts` imports `seed-data/*.json` (raw Shopify exports): 717
products, 38 categories, images, and parses care details out of description
HTML. It also creates the owner account. Idempotent — re-running updates
rather than duplicates.

## Backups

**Manual (works everywhere):**

```bash
pg_dump "$DATABASE_URL" -Fc -f backup-$(date +%F).dump   # PowerShell: use $(Get-Date -Format yyyy-MM-dd)
```

**Restore:**

```bash
pg_restore -d "$DATABASE_URL" --clean --if-exists backup-2026-07-23.dump
```

**Neon**: automatic point-in-time restore (history retention varies by plan);
branch the database from a past timestamp in the console, verify, then
promote. Still take periodic `pg_dump`s before risky migrations — they're
free insurance.

**Cadence recommendation**: nightly `pg_dump` once real orders exist, and
always one immediately before `migrate deploy` in production.

## Connection troubleshooting

- `P1001 can't reach database server` — service down or wrong host/port.
- `password authentication failed` — check the password in `DATABASE_URL`
  (special characters must be URL-encoded).
- Neon: `sslmode=require` must be present; free-tier databases suspend when
  idle and take ~1s to wake on first query.
