// Public tracking URLs per carrier. Returns null for unknown carriers or
// placeholder tracking numbers so we never link customers to a 404.

export function trackingUrl(
  carrier: string,
  trackingNumber: string | null | undefined,
): string | null {
  if (!trackingNumber || trackingNumber.startsWith("1ZDEV")) return null;
  const n = encodeURIComponent(trackingNumber);
  switch (carrier.toUpperCase()) {
    case "UPS":
      return `https://www.ups.com/track?tracknum=${n}`;
    case "FEDEX":
      return `https://www.fedex.com/fedextrack/?trknbr=${n}`;
    case "USPS":
      return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${n}`;
    case "DHL":
      return `https://www.dhl.com/us-en/home/tracking.html?tracking-id=${n}`;
    default:
      return null;
  }
}

export const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending payment",
  PAID: "Paid",
  PACKING: "Being packed",
  READY_TO_SHIP: "Ready to ship",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
  PARTIALLY_REFUNDED: "Partially refunded",
};

/** Ordered steps shown on the customer tracking timeline. */
export const FULFILLMENT_STEPS = [
  "PAID",
  "PACKING",
  "READY_TO_SHIP",
  "SHIPPED",
  "DELIVERED",
] as const;
