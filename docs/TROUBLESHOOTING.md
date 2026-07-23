# Troubleshooting

Symptoms → causes → fixes, most common first.

## Build & deploy

**`npm run build` fails on Vercel but works locally**
- Env vars missing on Vercel — `DATABASE_URL` is needed at build time for
  pages that query during static generation. Add all required vars, redeploy.
- Node version mismatch — set the Node version in Vercel project settings
  to match local (20+).

**TypeScript errors referencing `.next/types` or deleted pages**
- Stale build artifacts. Delete the `.next` folder and rebuild.

**`Property 'x' does not exist on type 'PrismaClient'` after a schema change**
- Client not regenerated: `npx prisma generate`, then **restart the dev
  server** — the running process keeps the old client in memory.

## Database

**`P1001: Can't reach database server`**
- Local: Postgres service stopped (Windows: `services.msc` →
  postgresql-x64-17 → Start).
- Neon: missing `?sslmode=require`, or IP allowlist enabled on a plan that
  has one.

**`password authentication failed`**
- Wrong password in `DATABASE_URL`; URL-encode special characters
  (`@` → `%40` etc.).

**Migration fails with "database schema is not empty"**
- You're pointing `migrate dev` at a database that predates migrations. Use
  `migrate deploy` for production databases; use a fresh database for dev.

## Stripe

**Checkout button says "Place Order (Test Mode)"**
- Expected until `STRIPE_SECRET_KEY` is set. Not an error.

**Customer paid but order stays PENDING**
- The webhook isn't reaching you. Check Stripe Dashboard → Webhooks →
  endpoint → recent deliveries. Common causes: endpoint not created for
  **live mode**, wrong URL, wrong `STRIPE_WEBHOOK_SECRET` (test vs live
  secrets differ).

**Webhook returns 400 Invalid signature**
- `STRIPE_WEBHOOK_SECRET` doesn't match this endpoint, or something rewrote
  the raw body. Copy the signing secret from the exact endpoint entry.

**Webhook returns 501**
- `STRIPE_SECRET_KEY` or `STRIPE_WEBHOOK_SECRET` unset in the deployed env.

## Auth

**Can't log into `/admin`**
- Account role is `CUSTOMER` — staff access requires a staff role (set by
  the owner in the database or a future employees screen).
- Repeated failures → rate limiter engaged; wait a minute.

**Everyone got logged out after a deploy**
- `AUTH_SECRET` changed. Expected side effect; keep it stable.

**Auth redirects go to localhost in production**
- `AUTH_URL` still `http://localhost:3000` on Vercel. Set it to the real
  origin and redeploy.

## Images & uploads

**Catalog images broken**
- They load from `cdn.shopify.com` — needs internet; and the Shopify store
  must still exist (paused is fine). Long-term fix: R2 migration
  ([STORAGE_SETUP.md](STORAGE_SETUP.md)).

**Admin image upload fails**
- File type not on the allowlist (images only), or — on Vercel — uploads
  still target the local filesystem, which is ephemeral in serverless.
  R2 integration is required before production uploads.

**Next/Image "hostname not configured"**
- The image host isn't in `next.config.ts` → `images.remotePatterns`. Add it.

## Email (once Resend is integrated)

**Emails not arriving / in spam**
- Domain not verified in Resend; SPF/DKIM records missing or not yet
  propagated. `nslookup -type=TXT <record>` to verify.
- Free-tier daily cap (100/day) reached.

## Shipping (once aggregator is integrated)

**No rates returned**
- Destination outside the lower 48 (policy blocks it), overnight service
  unavailable for that ZIP, or the carrier isn't connected in the
  Shippo/EasyPost dashboard.

**Address validation rejects a valid rural address**
- Aggregators lean on USPS data; override manually and note it on the order.

## Dev server

**Port 3000 in use / "Another next dev server is already running"**
- A previous server (or its orphaned process) holds the port. Find and kill:
  PowerShell `Get-NetTCPConnection -LocalPort 3000 -State Listen` →
  `Stop-Process -Id <pid>`. If the process is already gone but the message
  persists, delete `.next/dev`.

**Changes to `src/lib` not taking effect**
- Turbopack hot-reloads most things, but Prisma client changes and env var
  edits require a full restart.
