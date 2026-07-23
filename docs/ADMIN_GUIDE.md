# Admin Guide

The admin portal lives at **`/admin`** and requires a staff account. Roles:
`OWNER`, `ADMIN`, `INVENTORY_MANAGER`, `SHIPPING_MANAGER`, `SUPPORT`,
`MARKETING`, `VIEWER` (read-only staff), plus `CUSTOMER` for shoppers.
Store Settings is restricted to OWNER/ADMIN; order management to
OWNER/ADMIN/SHIPPING_MANAGER/SUPPORT. Sensitive actions are recorded in the
audit log.

## Dashboard (`/admin`)

At-a-glance store stats and recent activity. Start here to spot new orders.

## Products (`/admin/products`)

- **List**: search and browse the full catalog with stock levels and status.
- **New / Edit**: name, SKU, pricing (price, compare-at, cost), inventory,
  livestock type, care profile (lighting, flow, placement, care level, tank
  size), SEO fields, shipping restrictions, tags.
- **Images**: drag-and-drop upload (allowlisted image types only), reorder,
  alt text.
- **Inventory modes** — the key concept:
  - `STANDARD`: quantity-tracked; the customer receives a representative
    specimen.
  - `WYSIWYG`: the listing **is** the photographed specimen. Quantity is 1,
    and the moment it sells the product flips to `SOLD` automatically —
    including when two customers race for it (one wins, the other's order is
    flagged for follow-up instead of overselling).
- **Statuses**: `DRAFT` (hidden), `ACTIVE` (live), `ARCHIVED`, `SOLD`.

## Orders (`/admin/orders`)

- **List**: all orders with status, total, and customer; filter by status.
- **Detail** (`/admin/orders/<id>`):
  - Change status through the lifecycle:
    `PENDING → PAID → PROCESSING → SHIPPED → DELIVERED`
    (plus `CANCELLED` / `REFUNDED` / `PARTIALLY_REFUNDED`).
  - **Shipments**: add a shipment with carrier, service, and tracking number
    (manual entry until the shipping-aggregator integration; labels
    print with a placeholder). Shipment statuses: PENDING, LABEL_CREATED,
    IN_TRANSIT, DELIVERED, EXCEPTION.
  - **Packing slip**: printable from the order (also used as the box label).
  - Internal notes — including automatic `⚠ OVERSOLD` flags when a race
    was lost; resolve these by contacting the customer and refunding.
- **Manual order builder** (`/admin/orders/new`): create phone/text/live-sale
  orders — search products, set quantities, shipping and discount amounts,
  attach a customer.

## Customers (`/admin/customers`)

Customer list with order history, Reef Points balance, store credit, VIP
tier, and internal CRM notes/tags.

## Settings (`/admin/settings`) — OWNER/ADMIN only

Every business rule, editable live (changes apply storewide immediately and
are audit-logged):

- **Shipping**: free-shipping threshold ($350), overnight rate ($60),
  in-state rate ($40), home state, max box weight, method label/description,
  ship-days note, restrictions note, local pickup on/off.
- **Live Arrival Guarantee**: guarantee length (9 days), report window
  (3 days), DOA video window (2 h), high-value video threshold ($150),
  cancellation fee (20%), coral/fish hold limits.
- **Store info**: phone, hours, support email, Instagram/TikTok handles.

The storefront policy pages (`/shipping`, `/guarantee`, `/contact`) and
checkout all read these values — editing here updates everywhere at once.

## Coming in later phases

Invoices (PDF generation, resend, credit notes), reports/analytics,
marketing (discount codes UI, gift cards, abandoned cart), support tickets,
and employee/permission management screens. The database schema for coupons,
points, stock alerts, and audit logs already exists.
