# Shipping Setup

## Architecture decision (2026-07-23)

Carrier connectivity goes through a **shipping aggregator** — Shippo or
EasyPost — rather than three separate UPS/FedEx/USPS developer integrations.
One account and one API key provide all three carriers: real-time rates,
address validation, label purchase (PDF/ZPL), and tracking webhooks, priced
per label with no carrier certification process. Direct carrier APIs only
make sense with negotiated volume rates; if you have negotiated UPS rates,
Shippo/EasyPost can attach your own UPS account so those rates still apply.

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
| Recommendation | slightly friendlier dashboard | slightly cheaper at volume |

Either works — pick one, create the account, generate an API key, and paste
it into the matching env var.

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
