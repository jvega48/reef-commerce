# Installation — Local Development

From a blank machine to a running store. Commands are shown for Windows
(PowerShell) and macOS/Linux where they differ.

## 1. Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | 20+ (project developed on 24) | https://nodejs.org or `winget install OpenJS.NodeJS.LTS` |
| PostgreSQL | 16+ (developed on 17) | https://www.postgresql.org/download/ or `winget install PostgreSQL.PostgreSQL.17` |
| Git | any recent | https://git-scm.com |

Verify: `node -v`, `psql --version`, `git --version`.

## 2. Clone and install

```bash
git clone <your-repo-url> reef-commerce
cd reef-commerce
npm install
```

## 3. Create the database

Using the postgres superuser (password set during Postgres install):

```bash
psql -U postgres -c "CREATE DATABASE reef_commerce;"
```

## 4. Configure environment

```bash
cp .env.example .env        # Windows: copy .env.example .env
```

Edit `.env`:
- `DATABASE_URL` — `postgresql://postgres:<your-password>@localhost:5432/reef_commerce`
- `AUTH_SECRET` — run `npx auth secret` (writes it for you) or paste any long random string
- Leave everything else as-is for local dev.

Full reference: [ENVIRONMENT_VARIABLES.md](ENVIRONMENT_VARIABLES.md).

## 5. Create the schema (migrations)

```bash
npx prisma migrate dev
```

This applies every migration in `prisma/migrations/` and generates the Prisma
client into `src/generated/prisma`.

## 6. Seed the catalog

```bash
npx prisma db seed
```

Imports the full AquaVida365 catalog (717 products, 38 categories) from
`seed-data/`, creates the owner account, and parses care info (lighting, flow,
placement, care level) out of the product descriptions. Idempotent — safe to
re-run.

## 7. Run the dev server

```bash
npm run dev
```

Open http://localhost:3000. Admin portal: http://localhost:3000/admin —
sign in with the seeded owner account (see README; change the password).

## 8. Run the tests

```bash
npm test
```

Runs three integration suites against your local database: shipping math vs.
published policy, checkout finalization idempotency, and the oversell race
guard. All must pass. (They create and clean up their own test rows.)

## 9. Production build (locally)

```bash
npm run build   # must complete with no errors
npm start       # serves the production build on :3000
```

## Common install problems

- **`prisma migrate dev` can't reach the DB** — Postgres service not started
  (Windows: `services.msc` → postgresql-x64-17) or wrong password in `DATABASE_URL`.
- **Seed fails reading JSON** — files in `seed-data/` were saved with a UTF-8
  BOM by PowerShell; the seed strips BOMs, so pull the originals from git if
  they were re-saved by hand.
- **`npm install` warns about engines** — use Node 20+.
