# Deployment — GitHub → Vercel → Neon

The production topology: code on a **private GitHub repo**, hosting on
**Vercel** (Next.js's native platform — every push deploys), database on
**Neon** (managed Postgres). Supabase works identically where Neon is
mentioned. Total cost at launch traffic: free tiers cover all three.

## Overview

1. Create GitHub repository (private)
2. Push code
3. Create Neon database
4. Connect Vercel to the repo
5. Add environment variables
6. Deploy — then seed the cloud database

## 1. GitHub

```bash
# from the project directory (repo already has full history)
gh repo create aquavida365 --private --source . --push
```

Or create an empty private repo at github.com, then:

```bash
git remote add origin https://github.com/<you>/aquavida365.git
git push -u origin master
```

## 2. Neon (PostgreSQL)

1. Sign up at https://neon.tech (free tier is fine to start).
2. Create a project → note the **connection string**
   (`postgresql://...neon.tech/neondb?sslmode=require`).
3. That string becomes `DATABASE_URL` in Vercel.

## 3. Vercel

1. Sign up at https://vercel.com with your GitHub account.
2. **Add New → Project** → import the `aquavida365` repo.
3. Framework preset: Next.js (auto-detected). Build command `next build`
   (default). No other build settings needed.
4. Before the first deploy, add the environment variables (next section).
5. Deploy.

## 4. Environment variables (Vercel → Project → Settings → Environment Variables)

Minimum for a working deploy:

| Name | Value |
|---|---|
| `DATABASE_URL` | Neon connection string |
| `AUTH_SECRET` | output of `npx auth secret` (generate a NEW one for prod) |
| `AUTH_URL` | `https://<your-domain>` (or the vercel.app URL until DNS is set) |
| `NEXT_PUBLIC_SITE_URL` | same as `AUTH_URL` |

Add Stripe/Resend/Shippo/R2 keys as those services come online — see their
setup docs. Full reference: [ENVIRONMENT_VARIABLES.md](ENVIRONMENT_VARIABLES.md).

## 5. Migrate and seed the cloud database

Run once from your machine, pointing at Neon:

```bash
# PowerShell
$env:DATABASE_URL = "<neon-connection-string>"
npx prisma migrate deploy
npx prisma db seed
```

(`migrate deploy` applies committed migrations without generating new ones —
this is the production-safe command.)

Then **immediately change the owner password** by logging into
`https://<site>/admin` and updating the account, and set real values in
Admin → Settings if anything differs from the published-policy defaults.

## 6. Domain, DNS, SSL

See [DOMAIN_SETUP.md](DOMAIN_SETUP.md). Short version: add the domain in
Vercel → Project → Settings → Domains, point DNS (A record to `76.76.21.21`
or CNAME to `cname.vercel-dns.com`), and Vercel provisions SSL automatically.
Update `AUTH_URL` / `NEXT_PUBLIC_SITE_URL` to the final domain and redeploy.

## Ongoing deploys

Every `git push` to `master` triggers a production deploy. Pushes to other
branches create preview deployments with unique URLs.

If a migration accompanies a code change, run
`npx prisma migrate deploy` against Neon before (or immediately after)
the push — Vercel builds do not run migrations automatically.

## Rollback

- **Code**: Vercel → Deployments → pick the previous good deployment →
  "Promote to Production". Instant, no rebuild.
- **Database**: Neon keeps point-in-time restore on paid plans; on the free
  tier, restore from your latest `pg_dump` backup
  (see [DATABASE_SETUP.md](DATABASE_SETUP.md)). Migrations in this repo are
  additive so far — rolling code back does not require rolling the schema back.

## Post-deploy verification

Work through [CONFIGURATION_CHECKLIST.md](CONFIGURATION_CHECKLIST.md):
storefront loads, shop and product pages render, checkout completes (test
mode or Stripe test card), admin portal reachable, order appears in admin,
packing slip prints, sitemap at `/sitemap.xml`.
