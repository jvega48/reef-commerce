# Environment Variables

Copy `.env.example` to `.env` and fill in. On Vercel, set these under
Project → Settings → Environment Variables. Variables prefixed
`NEXT_PUBLIC_` are exposed to the browser — never put secrets in them.

## Required

### `DATABASE_URL`
- **Purpose**: PostgreSQL connection string used by Prisma (app, migrations, seed).
- **Example**: `postgresql://postgres:postgres@localhost:5432/reef_commerce`
  — production: `postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require`
- **Where to get it**: local Postgres install, or Neon/Supabase dashboard.
- **Used by**: everything — the app cannot start without it.

### `AUTH_SECRET`
- **Purpose**: encrypts Auth.js session tokens (JWT).
- **Example**: 44-char random base64 string.
- **Where to get it**: `npx auth secret` generates one. Use a different value in production than in dev; changing it logs every user out.
- **Used by**: login, sessions, admin access.

### `AUTH_URL`
- **Purpose**: canonical origin for auth callbacks and Stripe redirect URLs.
- **Example**: `http://localhost:3000` (dev), `https://aquavida365.com` (prod).
- **Used by**: Auth.js, Stripe Checkout success/cancel redirects.

### `NEXT_PUBLIC_SITE_URL`
- **Purpose**: public site origin used in sitemap, robots.txt, OpenGraph/JSON-LD metadata.
- **Example**: same as `AUTH_URL`.
- **Used by**: SEO output. Falls back to `http://localhost:3000` if unset.

## Stripe (payments live only when set)

### `STRIPE_SECRET_KEY`
- **Purpose**: server-side Stripe API key. When empty, checkout runs in clearly-labeled test mode (orders complete instantly, no payment taken).
- **Example**: `sk_test_...` (test) / `sk_live_...` (production).
- **Where to get it**: Stripe Dashboard → Developers → API keys. See [STRIPE_SETUP.md](STRIPE_SETUP.md).
- **Used by**: checkout server action, webhook route.

### `STRIPE_WEBHOOK_SECRET`
- **Purpose**: verifies webhook signatures on `/api/stripe/webhook`. Without it the webhook returns 501 and paid orders are not finalized.
- **Example**: `whsec_...`
- **Where to get it**: Stripe Dashboard → Developers → Webhooks → your endpoint; or `stripe listen` output in dev.
- **Used by**: `/api/stripe/webhook`.

### `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- **Purpose**: reserved for client-side Stripe elements. Current flow uses hosted Stripe Checkout, which doesn't need it — safe to leave empty.
- **Example**: `pk_live_...`

### `EMAIL_FROM`
- **Purpose**: From address on all outbound transactional email. The domain must be verified in Resend before mail delivers.
- **Example**: `AquaVida365 <orders@aquavida365.com>`
- **Used by**: every email template via `src/lib/email.ts`.

### `CRON_SECRET`
- **Purpose**: bearer token protecting `/api/cron/recover-carts` (abandoned-cart sweep). On Vercel Cron the `x-vercel-cron` header authorizes automatically; this secret blocks anyone else from triggering the job. Generate with `openssl rand -hex 32`.
- **Used by**: `/api/cron/recover-carts`; the schedule lives in `vercel.json` (every 4 hours).

## Planned integrations (leave empty until their code phase lands)

| Variable | Service | Purpose | Where to get it |
|---|---|---|---|
| `SHIPPO_API_KEY` | Shippo | **implemented** — rates, labels, tracking (FedEx/UPS/USPS via one API). Test token = free labels. See docs/SHIPPO_SETUP.md | goshippo.com → Settings → API |
| `SHIPPO_WEBHOOK_SECRET` | Shippo | shared secret for the tracking webhook (`?token=`) | `openssl rand -hex 32` |
| `EASYPOST_API_KEY` | EasyPost | alternative aggregator to Shippo — set one, not both | easypost.com → API Keys |
| `RESEND_API_KEY` | Resend | transactional email (order confirmations, tracking) | resend.com → API Keys |
| `R2_ACCOUNT_ID` | Cloudflare R2 | account for S3-compatible storage | Cloudflare dashboard → R2 |
| `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | Cloudflare R2 | bucket credentials | R2 → Manage API Tokens |
| `R2_BUCKET` | Cloudflare R2 | bucket name for product images | you choose at bucket creation |
| `R2_PUBLIC_URL` | Cloudflare R2 | public base URL serving the bucket | R2 bucket → Settings → Public access |

Setting these before the integration code exists is harmless — they are
simply unused.
