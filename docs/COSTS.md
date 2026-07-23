# Monthly Cost Breakdown

Design goal: **$0/month infrastructure at launch**, scaling costs only with
revenue. Everything below the "unavoidable" line runs on free tiers that are
production-appropriate for a small business (not trials).

## Infrastructure — $0/month at launch

| Service | Plan | Free tier covers | When you'd pay |
|---|---|---|---|
| Vercel (hosting + CDN + SSL) | Hobby | 100 GB bandwidth/mo, unlimited deploys | ~$20/mo Pro if traffic outgrows Hobby or you add teammates |
| Neon (PostgreSQL) | Free | 0.5 GB storage, autosuspend | $19/mo Launch for more storage/history — current DB is well under 0.5 GB |
| GitHub (repo + Actions CI) | Free | private repos, 2,000 CI min/mo | effectively never at this scale (~5 min/build) |
| Cloudflare R2 (images) | Free | 10 GB storage, **zero egress fees** | $0.015/GB-mo beyond 10 GB |
| Resend (email) | Free | 3,000 emails/mo, 100/day | $20/mo at 50k emails |
| Auth.js (login) | open source | everything | never |
| PostgreSQL full-text search | built-in | everything (717-product catalog) | never — no Algolia needed |
| Next.js image optimization | built-in Vercel | 1,000 source images/mo on Hobby | covered by catalog size; Pro if exceeded |
| Analytics (GA4 + Search Console + MS Clarity) | Free | everything | never at this scale |
| Monitoring | Vercel logs + UptimeRobot free | basics | optional Sentry free tier for error tracking |

## Unavoidable / per-transaction costs

| Item | Cost |
|---|---|
| Domain (aquavida365.com — already owned) | ~$10–15/year renewal |
| Stripe | 2.9% + $0.30 per transaction (no monthly fee) |
| Shipping labels (Shippo/EasyPost) | ~$0.05–0.07/label + actual carrier postage (no monthly fee on pay-as-you-go) |

## Costs eliminated vs. the Shopify store

Shopify Basic (~$39/mo) + transaction/app fees go away once the platform
replaces the store. The savings roughly fund the eventual paid tiers if the
store grows into them.

## Deliberately avoided

- **Algolia** — PostgreSQL full-text search handles this catalog size with
  no account and no bill.
- **Separate backend hosting** (NestJS on a VPS/Fly/Railway) — Next.js API
  routes and server actions run inside Vercel's free tier instead.
- **Paid CI** — GitHub Actions included minutes cover lint/typecheck/tests/build.
- **Clerk/auth SaaS** — Auth.js is open source and already integrated.
- **Paid PDF service** — invoice PDFs (upcoming phase) will use an
  open-source library, not a document API.

## Rule for future choices

When an integration decision comes up: open source first, then free tier,
then the cheapest service with a generous free tier — and any paid
recommendation must state the monthly cost, a free alternative, and that
alternative's limitation. (This is how Shippo-vs-direct-UPS and
Postgres-vs-Algolia were decided.)
