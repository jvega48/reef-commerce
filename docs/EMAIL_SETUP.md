# Email Setup (Resend)

**Status: planned integration.** The email phase adds order confirmation,
shipping/tracking notification, and password reset emails via
[Resend](https://resend.com). `RESEND_API_KEY` is already reserved in
`.env.example`. Do the account + domain setup below at any time — domain
verification takes minutes of work but DNS can take hours to propagate, so
it's worth doing early.

## 1. Create the account

1. https://resend.com → sign up.
2. Free tier: 3,000 emails/month, 100/day — plenty for launch.

## 2. Verify the sending domain

Sending from `orders@aquavida365.com` (rather than resend's shared domain)
requires proving you own the domain:

1. Resend dashboard → **Domains → Add Domain** → `aquavida365.com`.
2. Resend shows DNS records to add. In your DNS provider (wherever the domain
   is hosted — see [DOMAIN_SETUP.md](DOMAIN_SETUP.md)) add exactly what's shown:
   - **SPF** — a TXT record (usually on `send.aquavida365.com`) authorizing
     Resend's servers to send for you.
   - **DKIM** — a TXT record with a public key so receiving servers can verify
     the mail wasn't altered.
   - **MX** (bounce handling) — as listed.
3. Back in Resend, click **Verify**. Status must turn green before production
   sending. Propagation can take up to 24–48h but is usually < 1h.

SPF + DKIM are what keep order confirmations out of spam folders — don't
skip domain verification and send from the shared domain in production.

## 3. API key

Dashboard → **API Keys → Create** → full access → copy into
`RESEND_API_KEY` (local `.env` and Vercel).

## 4. Testing

- Resend test mode: keys work immediately; before domain verification you can
  send only to your own signed-up address — good for development.
- Once the integration phase lands, every email template will be previewable
  and test-sendable from the admin.

## Planned email triggers

| Email | Trigger |
|---|---|
| Order confirmation | order finalized (webhook/test mode) |
| Shipping confirmation + tracking | shipment marked shipped with tracking number |
| Delivery / DOA-window reminder | shipment delivered (aggregator webhook) |
| Password reset | user request |
| Back-in-stock alert | product restocked (StockAlert table already exists) |

## Troubleshooting

- **Emails land in spam** — domain not verified (SPF/DKIM missing), or the
  from-address domain doesn't match the verified domain.
- **"Domain not verified" API error** — DNS records not propagated yet;
  check with `nslookup -type=TXT <record-name>`.
- **Rate limited** — free tier caps at 100/day; upgrade or batch.
