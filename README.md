# AquaVida365 — Reef Commerce Platform

Full-stack ecommerce platform for [AquaVida365](https://aquavida365.com), a premium
reef-aquarium livestock retailer: customer storefront + role-gated admin portal.
Replaces the existing Shopify store; the full catalog (717 products, 38 categories)
and all published business policies have been migrated.

## Features

**Storefront** — homepage, shop with filters/search/pagination, product pages
(JSON-LD structured data, OpenGraph), cart, checkout with Stripe Checkout
(labeled test mode until keys are added), Reef Points earned on every order,
policy pages (`/shipping`, `/guarantee`, `/contact`) whose numbers come live
from admin settings, sitemap/robots, custom 404/error pages.

**Admin portal** (`/admin`, staff roles only) — dashboard, product CRUD with
drag-and-drop image uploads, WYSIWYG one-of-a-kind coral handling (auto-SOLD on
purchase, race-safe inventory), manual order builder, order detail with status
workflow + shipments + printable packing slip/label, customers, and a Settings
page where every business rule (shipping rates, free-shipping threshold,
guarantee windows, fees, store info) is editable — nothing is hardcoded.

**Hardening** — XSS sanitization, upload allowlist, login rate limiting,
security headers, oversell race-condition guard, money rounding, DB indexes,
audit logging, zero npm vulnerabilities.

## Stack

- **Next.js 16** (App Router, Turbopack) + React 19 + TypeScript
- **Tailwind CSS 4** — custom deep-ocean theme (`abyss`/`reef`/`coral` palettes in `globals.css`)
- **PostgreSQL 17** + **Prisma 7** (driver adapter; client generated to `src/generated/prisma`)
- **Auth.js v5** — credentials login, JWT sessions, role-based access
- **Stripe** Checkout + webhook (live once keys are set)

## Folder structure

```
docs/           All documentation (start with INSTALLATION.md)
prisma/         Schema, migrations, seed script
seed-data/      Raw Shopify catalog exports consumed by the seed
public/uploads/ Admin-uploaded product images (moves to R2 at deploy)
scripts/        Integration tests run by `npm test`
src/app/(store) Customer-facing routes
src/app/admin/  Admin portal routes
src/app/api/    REST endpoints (auth, Stripe webhook, admin search)
src/components/ Shared React components
src/lib/        Domain logic: checkout, settings, cart, server actions
```

## Quick start

```bash
npm install
cp .env.example .env       # fill in DATABASE_URL + AUTH_SECRET
npx prisma migrate dev     # create schema
npx prisma db seed         # import the AquaVida365 catalog from seed-data/
npm run dev                # http://localhost:3000
```

Owner login (dev): `vegajose4849@gmail.com` / `AquaVida365!` — **change before deploying**.

`npm test` runs the integration suites (shipping math, checkout finalize
idempotency, oversell race). `npm run build` must pass before deploying.

## Documentation

| Doc | What it covers |
|---|---|
| [docs/INSTALLATION.md](docs/INSTALLATION.md) | Local setup from zero |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | GitHub → Vercel → Neon production deploy |
| [docs/ENVIRONMENT_VARIABLES.md](docs/ENVIRONMENT_VARIABLES.md) | Every env var explained |
| [docs/DATABASE_SETUP.md](docs/DATABASE_SETUP.md) | Postgres, Prisma, migrations, backups |
| [docs/STRIPE_SETUP.md](docs/STRIPE_SETUP.md) | Payments, webhooks, going live |
| [docs/SHIPPING_SETUP.md](docs/SHIPPING_SETUP.md) | Carrier labels via Shippo/EasyPost |
| [docs/EMAIL_SETUP.md](docs/EMAIL_SETUP.md) | Resend + domain verification |
| [docs/STORAGE_SETUP.md](docs/STORAGE_SETUP.md) | Cloudflare R2 / S3 for images |
| [docs/DOMAIN_SETUP.md](docs/DOMAIN_SETUP.md) | DNS, HTTPS, redirects |
| [docs/ADMIN_GUIDE.md](docs/ADMIN_GUIDE.md) | How staff operate the store |
| [docs/USER_GUIDE.md](docs/USER_GUIDE.md) | How customers use the site |
| [docs/API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md) | Every endpoint + server actions |
| [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) | Common problems and fixes |
| [docs/CONFIGURATION_CHECKLIST.md](docs/CONFIGURATION_CHECKLIST.md) | Launch checklist |
| [docs/COSTS.md](docs/COSTS.md) | Monthly cost breakdown ($0 infra at launch) |
| [docs/business-rules.md](docs/business-rules.md) | Extracted store policies (source of truth) |

## Current integration status

| Integration | Status |
|---|---|
| Stripe Checkout + webhook | Code complete — add keys to go live |
| Shipping labels (Shippo/EasyPost) | Planned — admin shipments use manual tracking entry today |
| Transactional email (Resend) | Planned |
| Image storage (Cloudflare R2) | Planned — uploads currently save to `public/uploads`; catalog images hotlink Shopify CDN |

## Troubleshooting & FAQ

See [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md). Quick answers:

- **Checkout says "Test Mode"** — expected until `STRIPE_SECRET_KEY` is set.
- **Product images broken locally** — catalog images load from `cdn.shopify.com`; you need internet access.
- **`prisma migrate dev` fails to connect** — PostgreSQL service isn't running or `DATABASE_URL` is wrong; see docs/DATABASE_SETUP.md.
- **Port 3000 already in use** — a previous dev server is still alive; kill it or let Next pick another port.
