# AquaVida365 Business Rules — Source of Truth

Extracted from the live Shopify site (aquavida365.com) on 2026-07-23.
These are the owner's real, published policies. Implementation must match these
values, and every numeric value must be configurable in Admin → Settings —
nothing hardcoded.

## Shipping

| Rule | Value | Source |
|---|---|---|
| Overnight shipping, up to 5 lbs | **$60** (outside CA) | Shipping policy + announcement bar |
| Shipping within California | **$40** | Shipping policy |
| Free shipping threshold | **$350+** | Shipping policy + announcement bar + contact page |
| Carriers | UPS / FedEx | Shipping policy |
| Ship days | Tuesday or Wednesday normally | Shipping policy |
| DOA coverage exclusion | No DOA coverage for Mon or Fri shipments | Shipping policy |
| Delivery | Overnight, on customer-selected calendar date; someone must be present | Shipping policy |
| Coral order hold | Max 1 week | Shipping policy |
| Fish order hold | Max 5 business days | Shipping policy |
| WYSIWYG cancellation fee | 20% | Shipping policy |
| Ships to | Lower 48 states only | Shipping policy |
| Excluded | Puerto Rico, Hawaii, international (international transport voids guarantee) | Shipping policy |
| Alaska | Only via customer-arranged UPS/FedEx pickup | Shipping policy |
| Free-shipping exclusions | Live sales, phone/text orders, local pickup | Shipping policy |
| Pending balance | Blocks all shipments | Shipping policy |
| Local pickup | Available by request | Shipping policy + contact page |
| Signature | Not required but recommended | Shipping policy |

## Refunds / Live Arrival Guarantee

- **No refunds or returns on livestock** — case-by-case for unusual circumstances.
- **DOA claims**: clear video of deceased animal *before opening the bag* within
  **2 hours** of delivery + clear video of all sides of the box within 2 hours.
  Do not remove coral from plug; do not discard without authorization; do not
  refuse leaking/damaged boxes. Outcome: replacement or store credit at company
  discretion. Shipping costs non-refundable; customer pays replacement shipping.
  Excludes carrier delays, weather, mechanical issues, acts of nature.
- **9-day livestock guarantee**: covers live arrival and survival if package
  arrived on time, proper acclimation, cycled/stable tank, compatible tank
  mates, species needs met. **Concerns must be reported within the first 3
  days by email** — after day 3 with no report, claims are denied.
- High-value specimens (**over $150**) require a **15-second video outside water**.
- Order cancellations: 1-year store credit, or refund **minus 20% restocking fee**.
- Store credit = prepaid balance, cannot be applied retroactively.
- Exclusions: aggression, incompatible tank mates, poor water quality, improper
  acclimation, tank jumping, acclimation boxes, >60% unexplained loss from a
  single order without early reporting.

## Contact / Business Info

- Phone: **(310) 817-4113** (text for weekend appointments)
- Hours: Mon–Fri 1:00pm–6:00pm; weekends by appointment (text)
- Local tank maintenance service offered; special requests accepted
- Social: Instagram @aquavida365, TikTok @aquavida365
- Newsletter: "Get notified as soon as new livestock drops!"
- No public street address or email published on the site.

## Conflict Report (do not silently resolve)

1. **Base shipping price**: shipping policy + announcement bar say **$60** up to
   5 lbs; the contact page says **$55** up to 5 lbs. Two of three sources say
   $60, so **$60 is the implemented default**, editable in Admin → Settings.
   Owner should confirm and fix the stale contact-page copy on Shopify.
2. **Live homepage is broken**: aquavida365.com root URL currently returns a
   real HTTP 404 (Shopify-themed "404 Not Found" page). Product/collection
   pages and policies still resolve. Owner should check the Shopify theme's
   homepage assignment — and this strengthens the case for the replatform.
3. **Terms of Service and Privacy Policy pages are empty** on the live site.
   New drafts are required; owner must review before launch (legal content).

## Mapping to Admin Settings keys

All values above land in the `StoreSetting` table and are editable at
`/admin/settings`. Shipping math, checkout, and policy pages read from settings
at request time — never from constants.
