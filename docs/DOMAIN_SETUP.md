# Domain Setup

You already own **aquavida365.com** (currently pointed at Shopify). At
cutover, DNS moves from Shopify to Vercel. Until then, everything below can
be rehearsed with the free `<project>.vercel.app` URL.

## If buying a fresh domain

Any registrar works (Cloudflare Registrar sells at cost, Namecheap and
Porkbun are fine). Buy the domain; you only need access to its DNS records.

## Connecting the domain to Vercel

1. Vercel → Project → **Settings → Domains** → Add → `aquavida365.com`
   and `www.aquavida365.com`.
2. Vercel shows the DNS records it needs. At your DNS provider:
   - **Apex** (`aquavida365.com`): A record → `76.76.21.21`
   - **www**: CNAME → `cname.vercel-dns.com`
3. Wait for propagation (minutes to a few hours). Vercel's Domains page
   shows a green check when it's live.

**Cutover warning**: the moment the A record moves off Shopify, the old store
stops serving. Do this only after the checklist in
[CONFIGURATION_CHECKLIST.md](CONFIGURATION_CHECKLIST.md) passes on the
vercel.app URL — and keep the Shopify store paused rather than closed until
the image migration to R2 is done (catalog images currently hotlink
Shopify's CDN, which keeps working while the store is paused).

## www vs non-www

In Vercel's Domains settings, set **aquavida365.com** as the primary domain;
Vercel then 308-redirects `www.` to the apex automatically (or the reverse if
you prefer). Pick one and keep it — split traffic hurts SEO.

## HTTPS / SSL

Automatic. Vercel provisions and renews Let's Encrypt certificates for every
connected domain — no configuration, nothing to install. Verify by loading
`https://aquavida365.com` and checking the padlock; SSL Labs
(https://www.ssllabs.com/ssltest/) will grade it A.

## After DNS is live

1. Update `AUTH_URL` and `NEXT_PUBLIC_SITE_URL` env vars to
   `https://aquavida365.com` and redeploy — sitemap, OpenGraph, and Stripe
   redirects all key off these.
2. Add the domain in Stripe (Apple Pay domain registration).
3. Verify the domain in Resend (see [EMAIL_SETUP.md](EMAIL_SETUP.md)) —
   if DNS is on Cloudflare, records are added there.
4. Google Search Console: add the property, submit
   `https://aquavida365.com/sitemap.xml`.
