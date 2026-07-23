# AquaVida365 — Reef Commerce Platform

Full-stack reef aquarium commerce platform: customer storefront + internal admin portal.
Catalog migrated from the Shopify store at aquavida365.com (717 products, 38 categories).

## Stack

- **Next.js 16** (App Router, Turbopack) + React + TypeScript
- **Tailwind CSS 4** — custom deep-ocean theme (`abyss`/`reef`/`coral` palettes in `globals.css`)
- **PostgreSQL 17** + **Prisma 7** (driver adapter, client generated to `src/generated/prisma`)
- **Auth.js v5** — credentials login, JWT sessions, role-based access
- Stripe, UPS, Resend integrations scaffolded (env vars in `.env.example`)

## Getting started

```bash
npm install
# copy .env.example to .env and fill in DATABASE_URL
npx prisma migrate dev   # create schema
npx prisma db seed       # import the Aquavida365 catalog from seed-data/
npm run dev              # http://localhost:3000
```

Owner login (dev): `vegajose4849@gmail.com` / `AquaVida365!` — **change before deploying**.

## Key concepts

- **Inventory modes** — `STANDARD` (quantity-tracked; customer gets a representative
  specimen) vs `WYSIWYG` (the listing *is* the photographed specimen; quantity is 1
  and it must be marked `SOLD` when purchased).
- **Roles** — `OWNER, ADMIN, INVENTORY_MANAGER, SHIPPING_MANAGER, SUPPORT, MARKETING, VIEWER, CUSTOMER`.
  Staff roles gate `/admin` (see `src/app/admin/layout.tsx`).
- **Seed data** — `seed-data/*.json` are raw Shopify exports (products, collections,
  collection→product mapping). `prisma/seed.ts` parses embedded care info
  (Care Level / Lighting / Flow / Placement / Temperament) out of product HTML.
- **Images** — still served from the Shopify CDN (`cdn.shopify.com`, allowed in
  `next.config.ts`). Migrate to Cloudflare R2 before decommissioning Shopify.

## Roadmap (not yet built)

Stripe checkout + webhooks (incl. WYSIWYG auto-sold), UPS live rates/labels,
admin product CRUD + image upload, order management workflow, email/SMS automation,
loyalty redemption, CMS pages, CI/CD + Vercel deployment.
