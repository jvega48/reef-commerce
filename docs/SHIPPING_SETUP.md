# Shipping Setup

## Architecture decision (2026-07-23, reaffirmed 2026-07-29)

Carrier connectivity goes through a **shipping aggregator** — **EasyPost
(recommended)** or Shippo — rather than three separate UPS/FedEx/USPS developer
integrations. One account and one API key provide all three carriers: real-time
rates, address validation, label purchase (PDF/ZPL), and tracking webhooks,
priced per label with no carrier certification process. Direct carrier APIs only
make sense with negotiated volume rates; the aggregator can attach your own
FedEx/UPS account (bring-your-own-account) so those negotiated rates still apply
at ~$0 aggregator markup.

**Recommended carrier for live coral: FedEx Priority Overnight**, purchased
through the aggregator using your own linked FedEx account. USPS has no reliable
guaranteed overnight for live animals — reserve it for dry goods only. UPS Next
Day Air is the fallback.

**Why the aggregator wins for a small business** (lowest cost, simplest deploy,
easy maintenance): one integration instead of three OAuth flows; the aggregator
absorbs carrier API churn; a single sandbox and a single tracking webhook. The
only markup is a small per-label fee (~$0.05), which drops to $0 with
bring-your-own-account. Switching to direct carrier APIs later is low-risk
because all label/rate/track logic lives behind one `src/lib/shipping` module —
you'd only bother at very high volume.

## Current status

- **Working today**: admin order → shipments with carrier + manual tracking
  number entry, printable packing slip and label placeholder, shipment status
  workflow (PENDING → LABEL_CREATED → IN_TRANSIT → DELIVERED / EXCEPTION).
- **Planned (next integration phase)**: live rate quotes, one-click label
  purchase from the order screen, automatic tracking-number capture, and
  tracking-webhook status updates. Env vars are already reserved
  (`SHIPPO_API_KEY` / `EASYPOST_API_KEY`).

What is **not** waiting on the API: shipping *prices charged to customers*
are policy-driven flat rates from Admin → Settings ($60 up to 5 lbs, $40
in-CA, free over $350) — live carrier rates are for what *you* pay for the
label, not what the customer is charged.

## Choosing the aggregator

| | Shippo | EasyPost |
|---|---|---|
| Pay-as-you-go | $0.07/label after free tier | $0.05/label after free 120k/yr |
| UPS/FedEx/USPS | yes (discounted USPS/UPS built in) | yes |
| Use your own carrier account | yes | yes |
| Recommendation | solid alternative — friendlier dashboard | **recommended** — cheaper at volume, matches reserved env var |

Either works and the code path is identical (so you're not locked in) —
**EasyPost is the recommended default**; pick one, create the account, generate
an API key, and paste it into the matching env var.

## Account setup (Shippo shown; EasyPost is equivalent)

1. https://goshippo.com → sign up (business name, address — this becomes the
   default ship-from address on labels).
2. Settings → **Carriers**: USPS and UPS discounted accounts exist out of the
   box; connect FedEx by entering your FedEx account number (free to create
   at fedex.com/en-us/open-account.html).
3. Settings → **API** → copy the **Test token** first, later the **Live token**.
4. `.env` / Vercel: `SHIPPO_API_KEY=shippo_test_...` → later `shippo_live_...`.

Test tokens generate watermarked labels for free — use them to validate the
whole flow before buying a real label.

## Connecting the integration — step by step

1. **Create account** — EasyPost (recommended) or Shippo. Your business
   address becomes the default ship-from origin on labels.
2. **Connect carriers** — add your **FedEx** account number (primary, coral
   overnight); optionally UPS. USPS is available out of the box.
3. **API credentials** — copy the **Test** key first, **Production** key later.
4. **Environment variables** — set locally in `.env` and in Vercel:
   ```
   EASYPOST_API_KEY=EZTK...      # test key first; EZAK... for production
   # Shippo equivalent: SHIPPO_API_KEY=shippo_test_... → shippo_live_...
   ```
5. **Webhook configuration** — in the aggregator dashboard, point the
   **tracking webhook** at `https://<yourdomain>/api/shipping/webhook` (added in
   the integration phase, mirroring the Stripe webhook pattern). It advances
   shipment status automatically as packages move (IN_TRANSIT → DELIVERED /
   EXCEPTION) and triggers the tracking email.
6. **Sandbox testing** — with the test key, buy free watermarked labels and
   validate the full path: rate quote → buy label → tracking # auto-saved to the
   `Shipment` row → tracking email sent. No charges in test mode.
7. **Switch to production** — replace the test key with the live key in Vercel,
   buy one real label to confirm, then you're live.

## Business rules the integration must respect (from docs/business-rules.md)

- Live orders ship **Tuesday or Wednesday**, overnight service only
  (UPS Next Day Air / FedEx Priority Overnight equivalents).
- **Lower 48 only**; no HI/PR/international; AK only via customer-arranged
  facility pickup.
- Boxes up to **5 lbs** standard; heat/cold packs by season (weight them in).
- Customer selects the delivery date; no Monday/Friday DOA coverage.
- Local pickup bypasses labels entirely.

## Troubleshooting

- **Address validation rejects a rural address** — aggregators lean on USPS
  data; override manually and note it on the order.
- **Rates missing for a carrier** — that carrier isn't connected in the
  aggregator dashboard, or the service level (overnight) isn't available for
  the destination ZIP.
- **Label voids** — both providers allow voiding unused labels for refund
  within their window (Shippo 30 days, EasyPost varies by carrier).
