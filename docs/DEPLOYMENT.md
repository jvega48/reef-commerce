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

Add Stripe/Resend/R2 and Shippo keys as those services come online — see their
setup docs. Shipping runs on **Shippo** (FedEx Priority Overnight for live
coral):

| Name | Value |
|---|---|
| `SHIPPO_API_KEY` | `shippo_test_…` for testing, `shippo_live_…` for production |
| `SHIPPO_WEBHOOK_SECRET` | `openssl rand -hex 32` — used as `?token=` on the webhook URL |

See §5b below and [SHIPPO_SETUP.md](SHIPPO_SETUP.md) for the full connect +
webhook + sandbox→production walkthrough. Full reference:
[ENVIRONMENT_VARIABLES.md](ENVIRONMENT_VARIABLES.md).

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

## 5b. Shippo (shipping labels & tracking)

Shippo is the shipping provider. Full walkthrough:
[SHIPPO_SETUP.md](SHIPPO_SETUP.md). Deployment steps:

1. **Create a Shippo account** at https://goshippo.com. The business address
   becomes the default label origin.
2. **Obtain API keys** — dashboard → *Settings → API*. Copy the **Test token**
   (`shippo_test_…`) now; the **Live token** (`shippo_live_…`) for production.
3. **Add keys to Vercel** → *Settings → Environment Variables*:
   - `SHIPPO_API_KEY` = your token (test first, then live)
   - `SHIPPO_WEBHOOK_SECRET` = `openssl rand -hex 32`
4. **Redeploy** (Vercel redeploys on env-var change, or push to `master`).
5. **Verify connectivity** — open `/api/health`; `integrations.shipping` should
   be `true`. Set the ship-from address in **Admin → Settings → Shipping**.
6. **Generate a live label** — open a paid order → **🏷 Buy Shippo Label**
   (watermarked in test, real in live). Confirm the label PDF, tracking number,
   and cost are stored.
7. **Confirm tracking updates** — in Shippo → *Settings → Webhooks*, add
   `https://<yourdomain>/api/shipping/webhook?token=<SHIPPO_WEBHOOK_SECRET>` and
   subscribe to `track_updated`. A delivery event advances the order to
   DELIVERED.
8. **Verify shipping emails** — check **Admin → Emails** (or the customer inbox
   in live mode) for the "has shipped" and "delivered" messages.

Optional: enable **Auto-buy label on payment** in Admin → Settings → Shipping to
purchase the label automatically once payment settles (off by default — live
coral ships on scheduled days).

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
