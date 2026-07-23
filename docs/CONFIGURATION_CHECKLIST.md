# Launch Configuration Checklist

Everything the owner must do to take the platform live, in order. Each item
links to the doc that walks through it. Items marked **(later phase)** need
their integration code to land first — accounts can be created early.

## Phase A — Deploy the platform

- [ ] Create private GitHub repository and push code — [DEPLOYMENT.md](DEPLOYMENT.md)
- [ ] Create Neon PostgreSQL database — [DATABASE_SETUP.md](DATABASE_SETUP.md)
- [ ] Connect the repo to Vercel — [DEPLOYMENT.md](DEPLOYMENT.md)
- [ ] Add `DATABASE_URL` to Vercel
- [ ] Generate a fresh production `AUTH_SECRET` and add it
- [ ] Set `AUTH_URL` + `NEXT_PUBLIC_SITE_URL` (vercel.app URL for now)
- [ ] Deploy
- [ ] Run `npx prisma migrate deploy` + `npx prisma db seed` against Neon
- [ ] **Change the owner password** (seeded dev credential must die)
- [ ] Review Admin → Settings values against docs/business-rules.md
- [ ] Resolve the $55-vs-$60 shipping copy conflict (fix stale Shopify contact page too)

## Phase B — Payments

- [ ] Create Stripe account, complete business verification — [STRIPE_SETUP.md](STRIPE_SETUP.md)
- [ ] Add test keys, place a `4242...` test order end-to-end
- [ ] Create production webhook endpoint, add `STRIPE_WEBHOOK_SECRET`
- [ ] Switch to live keys; place and refund a real order
- [ ] Register domain for Apple Pay
- [ ] Decide tax approach (Stripe Tax vs manual) — consult accountant

## Phase C — Domain cutover

- [ ] Verify the full checklist passes on the vercel.app URL first
- [ ] Add aquavida365.com + www in Vercel — [DOMAIN_SETUP.md](DOMAIN_SETUP.md)
- [ ] Point DNS (A `76.76.21.21` / CNAME `cname.vercel-dns.com`)
- [ ] Confirm HTTPS padlock and www→apex redirect
- [ ] Update `AUTH_URL` / `NEXT_PUBLIC_SITE_URL` to the real domain, redeploy
- [ ] **Pause (don't close) Shopify** — catalog images still hotlink its CDN
- [ ] Google Search Console: add property, submit `/sitemap.xml`

## Phase D — Service accounts (create anytime; wired up in later phases)

- [ ] Choose Shippo or EasyPost, create account, connect carriers, get API key **(later phase)** — [SHIPPING_SETUP.md](SHIPPING_SETUP.md)
- [ ] Create Resend account, verify domain (SPF/DKIM DNS records) **(later phase)** — [EMAIL_SETUP.md](EMAIL_SETUP.md)
- [ ] Create Cloudflare R2 bucket + API token **(later phase)** — [STORAGE_SETUP.md](STORAGE_SETUP.md)
- [ ] Migrate catalog images off Shopify CDN to R2 **(later phase — required before closing Shopify)**

## Phase E — Launch verification

- [ ] Storefront: home, shop, product page, cart render on the real domain
- [ ] Checkout completes with a real card; order shows PAID in admin
- [ ] Inventory decremented; a WYSIWYG test product flips to SOLD
- [ ] Reef Points credited on an account order
- [ ] Packing slip prints from the order screen
- [ ] Policy pages show correct numbers (`/shipping`, `/guarantee`, `/contact`)
- [ ] Admin portal unreachable when logged out; reachable as owner
- [ ] `npm test` green on the deployed commit; Lighthouse pass on mobile
- [ ] Phone-order flow: build a manual order in the admin
- [ ] Backup taken (`pg_dump`) and restore rehearsed once

When every box above is checked, the platform is live and Shopify can stay
paused as an image host until the R2 migration completes.
