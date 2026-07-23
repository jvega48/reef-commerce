# Stripe Setup

The Stripe integration is **code-complete**: checkout creates a Stripe
Checkout Session, and the webhook finalizes the order (marks PAID, decrements
inventory race-safely, flips WYSIWYG corals to SOLD, awards Reef Points) when
payment succeeds. Until keys are set, checkout runs in a clearly labeled test
mode so the rest of the store remains fully testable.

## 1. Create the account

1. https://dashboard.stripe.com/register — sign up with the business email.
2. Complete business verification (legal name, EIN or SSN, bank account for
   payouts). You can build against test mode before verification finishes.

## 2. Get API keys (test mode first)

Dashboard → **Developers → API keys** (make sure the **Test mode** toggle is on):

- **Secret key** `sk_test_...` → `STRIPE_SECRET_KEY`
- Publishable key `pk_test_...` → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
  (optional — hosted Checkout doesn't require it)

## 3. Configure the webhook

The app listens at `POST /api/stripe/webhook` for `checkout.session.completed`.

**Local development:**

```bash
stripe login                       # Stripe CLI: https://stripe.com/docs/stripe-cli
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Copy the printed `whsec_...` into `STRIPE_WEBHOOK_SECRET` and restart the dev
server.

**Production:**

1. Dashboard → Developers → **Webhooks → Add endpoint**.
2. URL: `https://<your-domain>/api/stripe/webhook`
3. Events: select **`checkout.session.completed`** (only one needed).
4. Copy the endpoint's **Signing secret** into `STRIPE_WEBHOOK_SECRET` on Vercel.

Without the webhook, customers can pay but orders stay PENDING — the webhook
is what flips them to PAID.

## 4. Test a payment

With test keys set, place an order using card `4242 4242 4242 4242`, any
future expiry, any CVC/ZIP. Verify:

- redirected back to `/checkout/success`
- order shows **PAID** in `/admin/orders`
- inventory decremented (WYSIWYG item shows SOLD)
- Reef Points credited to the account

Other useful test cards: `4000 0000 0000 9995` (declined),
`4000 0025 0000 3155` (requires 3-D Secure).

## 5. Apple Pay & Google Pay

Hosted Stripe Checkout shows Apple Pay / Google Pay automatically when the
customer's device supports it — no code changes. Requirements:

- **Apple Pay**: Dashboard → Settings → Payment methods → Apple Pay →
  register your domain (Stripe hosts the verification file for hosted
  Checkout automatically).
- **Google Pay**: on by default for supported browsers.

## 6. Taxes

Options, simplest first:

1. **Stripe Tax** (recommended): Dashboard → Settings → Tax → enable, set the
   business address and registrations. Note: enabling automatic tax on the
   Checkout Session is a one-line code flag (`automatic_tax`) — ask for it
   when you're ready to register.
2. Manual: most livestock sellers collect tax only in their home state;
   consult your accountant for nexus rules.

## 7. Shipping rates in Stripe

Not used — shipping is calculated by the app from Admin → Settings (policy
rates: $60 / $40-in-CA / free over $350) and added to the Checkout Session as
a line item. Change rates in the admin, not in Stripe.

## 8. Going live

1. Finish Stripe business verification.
2. Toggle Dashboard to **Live mode** → Developers → API keys → copy
   `sk_live_...` into Vercel's `STRIPE_SECRET_KEY`.
3. Create a **live-mode webhook endpoint** (step 3 again — live and test
   webhooks are separate) and update `STRIPE_WEBHOOK_SECRET`.
4. Redeploy, place a real $1+ order with a real card, refund it from the
   Stripe dashboard.

## Troubleshooting

- **Webhook 501** — `STRIPE_SECRET_KEY` or `STRIPE_WEBHOOK_SECRET` missing in env.
- **Webhook 400 "Invalid signature"** — wrong `whsec_`, or a proxy is
  modifying the request body. Use the signing secret for the exact endpoint
  (test vs live are different).
- **Order stuck PENDING after payment** — webhook not configured or failing;
  check Dashboard → Webhooks → endpoint → recent deliveries for the error.
