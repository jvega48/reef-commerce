# API Documentation

## Architecture note

This is a Next.js App Router application: most reads are **server
components** querying the database directly, and most writes are **server
actions** (form posts handled by functions in `src/lib/*-actions.ts`).
Server actions are invoked by the framework with CSRF-protected POSTs — they
are not callable as public JSON endpoints. The REST surface is therefore
deliberately small.

## REST endpoints

### `GET|POST /api/auth/*` — Auth.js

Standard Auth.js (NextAuth v5) endpoints: `signin`, `signout`, `callback`,
`session`, `csrf`. Handled by the framework; credentials provider with
bcrypt-hashed passwords and login rate limiting.

- **Auth**: public (that's the point).
- **Session**: JWT cookie; `GET /api/auth/session` returns the current
  session JSON or `null`.

### `POST /api/stripe/webhook` — Stripe payment webhook

Finalizes an order after successful payment: marks it PAID, decrements
inventory (race-safe), flips WYSIWYG products to SOLD, awards Reef Points.
Idempotent — replayed events are no-ops.

- **Auth**: Stripe signature verification (`stripe-signature` header against
  `STRIPE_WEBHOOK_SECRET`). No session.
- **Request**: raw Stripe event JSON. Only `checkout.session.completed` is
  acted on; other events are acknowledged and ignored.
- **Responses**:
  - `200 {"received": true}` — processed (or ignored event type)
  - `400 {"error": "Missing signature" | "Invalid signature"}`
  - `501 {"error": "Stripe not configured"}` — env vars absent

### `GET /api/admin/products/search?q=<query>` — admin product search

Used by the manual order builder to find in-stock products.

- **Auth**: session cookie with a staff role; otherwise `401 {"error":"unauthorized"}`.
- **Request**: `q` — matches name, SKU, or scientific name
  (case-insensitive substring). Empty `q` returns the 20 most recently
  updated in-stock products.
- **Response** `200`, array (max 20):

```json
[
  {
    "id": "cmb...",
    "name": "Rainbow Fungia",
    "sku": "AV-1234",
    "price": 225,
    "quantity": 1,
    "inventoryMode": "WYSIWYG",
    "image": "https://cdn.shopify.com/..."
  }
]
```

## Server actions (write paths)

| Action | File | Who | What |
|---|---|---|---|
| `placeOrder` | `src/lib/checkout-actions.ts` | public | validates cart/stock/address, computes settings-based shipping, creates PENDING order, redirects to Stripe Checkout (or finalizes in test mode) |
| order management actions | `src/lib/order-actions.ts` | OWNER/ADMIN/SHIPPING_MANAGER/SUPPORT | status changes, shipments, manual orders |
| product management actions | `src/lib/*` (product actions) | staff roles | product CRUD, image upload (allowlisted types) |
| `saveSettings` | `src/lib/settings-actions.ts` | OWNER/ADMIN | validates (zod) and saves shipping/guarantee/store-info settings; audit-logged |
| cart actions | `src/lib/cart*` | public | add/update/remove cart items (session or user cart) |

## Metadata routes

- `GET /sitemap.xml` — all active products + static pages, from the database.
- `GET /robots.txt` — disallows `/admin`, `/api/`, `/account`, `/cart`,
  `/checkout`, `/login`, `/register`.

## Error conventions

REST endpoints return JSON `{"error": "<message>"}` with 4xx/5xx status.
Server actions redirect back to the form with `?error=<code>` query params
rendered as inline banners. Unhandled exceptions render the global error page
(no stack traces leak in production).
