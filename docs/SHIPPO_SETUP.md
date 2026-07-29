# Shippo Setup

Shippo is AquaVida365's shipping provider. It generates live rates, buys
carrier labels (FedEx/UPS/USPS), captures tracking numbers, and pushes delivery
updates back via webhook. This document is the complete, production-ready
walkthrough. For the architecture rationale (why an aggregator, why FedEx
overnight for coral) see [SHIPPING_SETUP.md](SHIPPING_SETUP.md).

> **What Shippo controls vs. what it doesn't.** Shippo determines what *you* pay
> for a label and the tracking that flows to the customer. The price the
> *customer* is charged is always the flat policy rate configured in
> **Admin → Settings → Shipping** ($60 overnight up to 5 lb, free over $350,
> $40 in-state) — it is not derived from live Shippo rates. All shipping rules
> live in the database and are editable without code changes.

---

## 1. Creating a Shippo account

1. Go to **https://goshippo.com** and sign up. The business name and address
   you enter become the default **ship-from / return address** printed on
   labels (you can override it per-store in Admin → Settings → Shipping).
2. **Sandbox vs Production.** Shippo has no separate sandbox *site* — one
   account exposes **two API tokens**:
   - **Test token** (`shippo_test_…`) → generates free, watermarked labels and
     fake tracking numbers. Use it for all testing.
   - **Live token** (`shippo_live_…`) → buys real postage against your balance
     or connected carrier account.
   The application auto-detects which mode it is in from the token prefix.
3. **Business verification.** None is required to *start* in test mode. To buy
   **real** labels you must add a payment method (Shippo billing) or connect
   your own carrier account (see §3). FedEx/UPS accounts are free to open;
   live-animal shipping arrangements should be confirmed with your carrier rep.
4. **Where to find API keys:** dashboard → **Settings → API** → *API Tokens*.
   Copy the Test token first; reveal the Live token when you go to production.

---

## 2. API configuration

The integration reads these environment variables:

| Variable | Purpose | Example |
|---|---|---|
| `SHIPPO_API_KEY` | Your Shippo API token. Prefix decides test vs live mode. | `shippo_test_abc123…` |
| `SHIPPO_WEBHOOK_SECRET` | Shared secret guarding the tracking webhook (Shippo doesn't sign webhooks). Generate with `openssl rand -hex 32`. | `9f2c…` |

- **Test mode:** set `SHIPPO_API_KEY=shippo_test_…`. Labels are free and
  watermarked; tracking numbers are simulated. The admin order screen shows a
  "Buy Shippo Label" button; everything works end-to-end without spending money.
- **Production mode:** set `SHIPPO_API_KEY=shippo_live_…`. Labels are billed.

### `.env.example` section (already included)

```bash
# ── Shipping (Shippo) ─────────────────────────────────────────────
SHIPPO_API_KEY=""            # shippo_test_* for testing, shippo_live_* for prod
SHIPPO_WEBHOOK_SECRET=""     # openssl rand -hex 32; used as ?token= on the webhook URL
EASYPOST_API_KEY=""          # optional alternative aggregator — leave empty with Shippo
```

---

## 3. Connecting Shippo (carriers, origin, defaults)

1. **Log in** to the Shippo dashboard.
2. **Connect carrier accounts** → *Settings → Carrier Accounts*:
   - **USPS** and **UPS** discounted accounts exist out of the box (no setup).
   - **FedEx** (recommended for live coral): click *Add Carrier → FedEx*, enter
     your FedEx account number (free to open at fedex.com). This lets you buy
     **FedEx Priority Overnight** at your negotiated rates ("bring your own
     account" — Shippo adds ~$0 markup).
   - You can also use **Shippo's carrier accounts** (USPS/UPS) with no account
     of your own — handy for dry goods.
3. **Ship-from / origin:** set in **Admin → Settings → Shipping → Ship-from /
   return address**. This is what prints on labels and is used as the rate
   origin. (The Shippo account address is only the fallback default.)
4. **Package defaults:** set the default parcel L×W×H (inches) and empty-box
   **tare weight** (oz) in the same settings section. Product weight (from each
   product's `weightGrams`) is added on top of the tare when a label is bought.
5. **Return address:** the ship-from address doubles as the return address.

Carrier-service selection: **Admin → Settings → Shipping → Default service
token** (default `fedex_priority_overnight`). If that exact service isn't
offered for a destination, the app auto-falls back to the cheapest overnight
(≤1-day) rate, then the cheapest rate overall.

---

## 4. Application setup

1. **Configure** `SHIPPO_API_KEY` (test token) in `.env` (local) or Vercel
   (deployed), then restart/redeploy.
2. **Verify the connection / test API connectivity:** open `/api/health` —
   `integrations.shipping` flips to `true` when a key is present. On the admin
   order screen, a **🏷 Buy Shippo Label** button appears for orders with a
   shipping address.
3. **Generate a test shipment + label:** open any paid order with a shipping
   address → **Buy Shippo Label**. The app creates a Shippo shipment, selects
   the overnight rate, buys the (watermarked) label, and stores everything.
4. **Retrieve the tracking number:** after purchase the shipment shows the
   carrier, service, tracking number (linked), label PDF, and cost. The tracking
   number is saved to the `Shipment` row and the customer is emailed.
5. **Validate an address:** the **✓ Validate Address** button runs the order's
   shipping address through Shippo and reports validity + any correction notes.

Automated flow once configured:

1. Rates are computed from the flat policy at checkout (live Shippo rates are
   used for the label side; enable "Use live Shippo rates" to fetch them).
2. AquaVida365 shipping rules are applied (free over $350, excluded states
   blocked at checkout, ship-day/blackout scheduling).
3. A Shippo label is generated — one-click from the order screen, or
   automatically after payment when **Auto-buy label on payment** is enabled.
4. The tracking number is stored on the `Shipment` row.
5. A packing slip is available at `/admin/orders/<id>/packing-slip`.
6. The customer is emailed their tracking link.
7. Order status advances to **SHIPPED**, then **DELIVERED** on the tracking
   webhook.
8. Shipment status shows in both the Customer Portal (`/account/orders/<id>`)
   and the Admin order screen.

---

## 5. Testing (end-to-end walkthrough)

Do this in **test mode** (`shippo_test_…`) — nothing is billed.

1. **Test checkout:** add a product to the cart, go to `/checkout`, enter a
   lower-48 shipping address, choose overnight. (Try an excluded state like HI
   to confirm it's rejected.)
2. **Test payment:** with Stripe test keys, pay with card `4242 4242 4242 4242`.
   The order finalizes to **PAID**. (No Stripe keys → dev mode finalizes
   immediately.)
3. **Test rate calculation:** on the admin order screen, the label flow requests
   live rates from Shippo and selects the overnight service.
4. **Test label generation:** click **🏷 Buy Shippo Label** → a watermarked PDF
   label is produced; the shipment row fills in.
5. **Test packing slip:** open **🖨 Packing Slip** on the order → a branded PDF.
6. **Test customer email:** check the server console (CONSOLE mode) or the
   **Admin → Emails** log for the "has shipped" message with the tracking link.
7. **Test the tracking page:** open `/account/orders/<id>` as the customer — the
   Tracking section shows the carrier, tracking number, and a "Track package"
   link; the fulfillment timeline reflects SHIPPED.
8. **Test delivery:** POST a `track_updated` event to the webhook (see §7) or
   click **Mark Delivered** — the order flips to DELIVERED and a delivery email
   is sent.

Automated coverage: `npx tsx scripts/test-shippo.ts` (part of `npm test`) runs
32 assertions over the business rules and the full label lifecycle (rate → buy →
track → deliver → void) against a mocked Shippo API — no key or network needed.

---

## 6. Production launch (sandbox → production)

1. **Replace the API key:** in Vercel, change `SHIPPO_API_KEY` from the
   `shippo_test_…` token to the `shippo_live_…` token.
2. **Add billing / connect carriers:** in Shippo, add a payment method or
   connect your FedEx/UPS account so live labels can be purchased.
3. **Set the webhook secret:** set `SHIPPO_WEBHOOK_SECRET` in Vercel and
   configure the webhook (see §7).
4. **Redeploy** (Vercel redeploys automatically on env-var change, or trigger a
   deploy).
5. **Verify:** `/api/health` shows `integrations.shipping: true`. Buy **one**
   real label on a small live order and confirm the PDF, tracking number, email,
   and status update.
6. **Smoke tests after deploy:**
   - Place a $1 test-priced order to your own address, buy a real label, print
     it, then **Void Label** to refund the postage (allowed within the carrier
     window).
   - Confirm the tracking webhook advances the order to DELIVERED.
   - Confirm the customer received the shipment email.

---

## 7. Webhook configuration & troubleshooting

**Webhook setup.** In the Shippo dashboard → *Settings → Webhooks*, add:

```
https://<yourdomain>/api/shipping/webhook?token=<SHIPPO_WEBHOOK_SECRET>
```

Subscribe to the **Track Updated** (`track_updated`) event. The `?token=` must
equal `SHIPPO_WEBHOOK_SECRET` or the endpoint returns 401 (Shippo does not sign
webhooks, so this shared secret is the auth). Tracking numbers are auto-
registered with Shippo when a label is bought, so updates start flowing
immediately.

### Common issues

| Issue | Cause | Resolution | Verify |
|---|---|---|---|
| **Invalid API key** | Wrong/blank `SHIPPO_API_KEY`, or test token in prod | Paste the correct token from Settings → API; redeploy | `/api/health` → `integrations.shipping: true`; Buy-label succeeds |
| **Authentication failures (401 from Shippo)** | Token revoked or truncated | Regenerate the token in Shippo; update the env var | Re-run the label flow |
| **Carrier connection problems** | Carrier not connected, or service not available for the ZIP | Connect the carrier in Shippo → Carrier Accounts; check the destination supports overnight | "No shipping rates were returned" disappears |
| **Label generation fails** | Missing ship-from address, weightless parcel, or bad destination | Fill Ship-from in Settings; ensure parcel tare > 0; validate the address | Buy-label returns success with a label URL |
| **Tracking updates not arriving** | Webhook URL/secret wrong, or event not subscribed | Re-check the webhook URL `?token=`, subscribe to `track_updated` | Order flips to DELIVERED after a test event |
| **Rate calculation errors** | Incomplete parcel/address or unconnected carrier | Verify parcel defaults + carrier; try Validate Address | Rates return on Buy-label |
| **Webhook returns 401** | `?token=` ≠ `SHIPPO_WEBHOOK_SECRET` | Align the two values | Webhook returns `{received:true}` |
| **Env-var mistakes** | Trailing spaces, wrong scope, forgot to redeploy | Re-enter in Vercel, redeploy | `/api/health` reflects the change |

---

## Final validation checklist

- ✅ Shipping rates calculate (flat policy at checkout; live Shippo rates for labels)
- ✅ Labels generate (Buy Shippo Label → watermarked in test, real in prod)
- ✅ Tracking numbers stored on the `Shipment` row
- ✅ Packing slips generate (`/admin/orders/<id>/packing-slip`)
- ✅ Tracking emails sent (shipment + delivery)
- ✅ Customer tracking page works (`/account/orders/<id>`)
- ✅ Admin order screen shows shipment info + label PDF + void
- ✅ Status updates: PAID → SHIPPED → DELIVERED (webhook)
- ✅ Checkout math matches configured business rules (test-promotions + test-shipping)

Covered by `scripts/test-shippo.ts` (32 assertions) in `npm test`.
