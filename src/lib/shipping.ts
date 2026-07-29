// ---------------------------------------------------------------------------
// Shipping orchestration — binds the Shippo client (shippo.ts) to orders and
// enforces AquaVida365's DB-configurable business rules (settings.ts). Pure
// rule helpers here are unit-tested in scripts/test-shippo.ts; the label
// purchase path is exercised there against a mocked Shippo API.
// ---------------------------------------------------------------------------

import { prisma } from "./prisma";
import { sendEmail } from "./email";
import { shipmentEmail, deliveredEmail } from "./email-templates";
import { trackingUrl as carrierTrackingUrl } from "./tracking";
import { getShippingSettings, type ShippingSettings } from "./settings";
import {
  createShipment,
  buyLabel,
  refundLabel,
  registerTracking,
  selectRate,
  shippoConfigured,
  type ShippoAddress,
  type ShippoParcel,
  type ShippoRate,
} from "./shippo";

const GRAMS_PER_OZ = 28.3495;

// ── Pure business-rule helpers (no I/O — unit tested) ──────────────────────

/** YYYY-MM-DD in the given (or local) timezone-naive form. */
export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** A date is deliverable if it is an allowed ship weekday and not blacked out. */
export function isDeliverableDate(dateStr: string, cfg: ShippingSettings): boolean {
  if (cfg.blackoutDates.includes(dateStr)) return false;
  const day = new Date(`${dateStr}T12:00:00`).getDay(); // noon avoids TZ edge
  return cfg.shipDays.includes(day);
}

/** The next deliverable date on/after `from` (defaults today), scanning ahead. */
export function nextDeliverableDate(cfg: ShippingSettings, from = new Date()): string {
  for (let i = 0; i < 60; i++) {
    const d = new Date(from);
    d.setDate(d.getDate() + i);
    const s = isoDate(d);
    if (isDeliverableDate(s, cfg)) return s;
  }
  return isoDate(from);
}

/** True when we ship to this state (not on the excluded list). */
export function isShippableState(state: string, cfg: ShippingSettings): boolean {
  return !cfg.excludedStates
    .map((s) => s.toUpperCase())
    .includes((state ?? "").trim().toUpperCase());
}

/** Parcel weight in ounces: empty-box tare + summed product weights. */
export function parcelWeightOz(
  itemWeightsGrams: { grams: number; quantity: number }[],
  cfg: ShippingSettings,
): number {
  const productOz = itemWeightsGrams.reduce(
    (sum, i) => sum + (i.grams * i.quantity) / GRAMS_PER_OZ,
    0,
  );
  const total = cfg.parcelTareOz + productOz;
  // Never send 0 — carriers reject weightless parcels.
  return Math.max(1, Math.round(total * 100) / 100);
}

// ── Address / parcel builders ──────────────────────────────────────────────

export function shipFromAddress(cfg: ShippingSettings): ShippoAddress {
  return {
    name: cfg.shipFromName,
    company: cfg.shipFromCompany || undefined,
    street1: cfg.shipFromStreet1,
    street2: cfg.shipFromStreet2 || undefined,
    city: cfg.shipFromCity,
    state: cfg.shipFromState,
    zip: cfg.shipFromZip,
    country: cfg.shipFromCountry || "US",
    phone: cfg.shipFromPhone || undefined,
    email: cfg.shipFromEmail || undefined,
  };
}

type OrderAddress = {
  name: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string | null;
};

export function toShippoAddress(a: OrderAddress, email: string): ShippoAddress {
  return {
    name: a.name,
    street1: a.line1,
    street2: a.line2 || undefined,
    city: a.city,
    state: a.state,
    zip: a.postalCode,
    country: a.country || "US",
    phone: a.phone || undefined,
    email,
  };
}

export function buildParcel(weightOz: number, cfg: ShippingSettings): ShippoParcel {
  return {
    length: String(cfg.parcelLengthIn),
    width: String(cfg.parcelWidthIn),
    height: String(cfg.parcelHeightIn),
    distance_unit: "in",
    weight: String(weightOz),
    mass_unit: "oz",
  };
}

// ── Rate quoting ────────────────────────────────────────────────────────────

const ORDER_FOR_SHIPPING = {
  items: { include: { product: { select: { weightGrams: true } } } },
  shippingAddress: true,
} as const;

async function loadOrderForShipping(orderId: string) {
  return prisma.order.findUnique({
    where: { id: orderId },
    include: ORDER_FOR_SHIPPING,
  });
}

/** Live Shippo rates for an order's parcel/destination. Empty if unconfigured. */
export async function getLiveRatesForOrder(orderId: string): Promise<ShippoRate[]> {
  if (!shippoConfigured()) return [];
  const order = await loadOrderForShipping(orderId);
  if (!order || !order.shippingAddress) return [];
  const cfg = await getShippingSettings();
  const weightOz = parcelWeightOz(
    order.items.map((i) => ({
      grams: i.product?.weightGrams ?? 0,
      quantity: i.quantity,
    })),
    cfg,
  );
  const shipment = await createShipment({
    addressFrom: shipFromAddress(cfg),
    addressTo: toShippoAddress(order.shippingAddress, order.email),
    parcels: [buildParcel(weightOz, cfg)],
  });
  return shipment.rates ?? [];
}

// ── Label purchase (the core production path) ──────────────────────────────

export type LabelResult =
  | { ok: true; shipmentId: string; trackingNumber: string; alreadyExisted?: boolean }
  | { ok: false; error: string };

/**
 * Buy a Shippo label for an order and persist everything: tracking number,
 * label URL, cost, Shippo IDs, shipment status. Also emails the customer their
 * tracking, advances the order to SHIPPED, and logs an event + audit entry.
 *
 * Idempotent: if a live (non-voided) label already exists for the order it is
 * returned instead of buying a second one — safe for the auto-purchase hook.
 */
export async function createLabelForOrder(
  orderId: string,
  opts: { actorId?: string | null; markShipped?: boolean } = {},
): Promise<LabelResult> {
  if (!shippoConfigured()) {
    return { ok: false, error: "SHIPPO_API_KEY is not configured." };
  }

  const existing = await prisma.shipment.findFirst({
    where: { orderId, voidedAt: null, labelUrl: { not: null } },
  });
  if (existing) {
    return {
      ok: true,
      shipmentId: existing.id,
      trackingNumber: existing.trackingNumber ?? "",
      alreadyExisted: true,
    };
  }

  const order = await loadOrderForShipping(orderId);
  if (!order) return { ok: false, error: "Order not found." };
  if (!order.shippingAddress) {
    return { ok: false, error: "Order has no shipping address (local pickup?)." };
  }

  const cfg = await getShippingSettings();
  if (!cfg.shipFromStreet1 || !cfg.shipFromZip) {
    return {
      ok: false,
      error: "Ship-from address is not set in Admin → Settings → Shipping.",
    };
  }
  if (!isShippableState(order.shippingAddress.state, cfg)) {
    return {
      ok: false,
      error: `We do not ship to ${order.shippingAddress.state}.`,
    };
  }

  const weightOz = parcelWeightOz(
    order.items.map((i) => ({
      grams: i.product?.weightGrams ?? 0,
      quantity: i.quantity,
    })),
    cfg,
  );

  let rate: ShippoRate | null;
  try {
    const shipment = await createShipment({
      addressFrom: shipFromAddress(cfg),
      addressTo: toShippoAddress(order.shippingAddress, order.email),
      parcels: [buildParcel(weightOz, cfg)],
    });
    rate = selectRate(shipment.rates ?? [], cfg.defaultServiceToken);
  } catch (e) {
    return { ok: false, error: `Rate request failed: ${(e as Error).message}` };
  }
  if (!rate) {
    return { ok: false, error: "No shipping rates were returned for this address." };
  }

  let txn;
  try {
    txn = await buyLabel(rate.object_id);
  } catch (e) {
    return { ok: false, error: `Label purchase failed: ${(e as Error).message}` };
  }
  if (txn.status !== "SUCCESS" || !txn.label_url) {
    const msg = txn.messages?.map((m) => m.text).join("; ") || txn.status;
    return { ok: false, error: `Shippo could not create the label: ${msg}` };
  }

  const carrier = rate.provider;
  const trackingNumber = txn.tracking_number ?? "";
  const markShipped = opts.markShipped ?? true;

  const shipment = await prisma.shipment.create({
    data: {
      orderId,
      carrier,
      service: rate.servicelevel.name,
      trackingNumber,
      trackingUrl:
        txn.tracking_url_provider ?? carrierTrackingUrl(carrier, trackingNumber),
      labelUrl: txn.label_url,
      cost: rate.amount ? Number(rate.amount) : null,
      shippoTransactionId: txn.object_id,
      shippoRateId: rate.object_id,
      eta: txn.eta ? new Date(txn.eta) : null,
      status: markShipped ? "IN_TRANSIT" : "LABEL_CREATED",
      shippedAt: markShipped ? new Date() : null,
    },
  });

  // Register the tracking number so Shippo pushes status webhooks for it.
  if (trackingNumber) {
    await registerTracking(carrier, trackingNumber).catch(() => {});
  }

  await prisma.orderEvent.create({
    data: {
      orderId,
      type: "shipment",
      message: `Shippo label purchased — ${carrier} ${rate.servicelevel.name}, tracking ${trackingNumber}`,
      visibleToCustomer: true,
      createdById: opts.actorId ?? null,
    },
  });
  await prisma.auditLog.create({
    data: {
      userId: opts.actorId ?? null,
      action: "shipment.label.buy",
      entity: `Order:${orderId}`,
      detail: { carrier, trackingNumber, cost: rate.amount, service: rate.servicelevel.token },
    },
  });

  if (markShipped) {
    if (["PENDING", "PAID", "PACKING", "READY_TO_SHIP"].includes(order.status)) {
      await prisma.order.update({ where: { id: orderId }, data: { status: "SHIPPED" } });
    }
    const tpl = shipmentEmail({
      orderNumber: order.orderNumber,
      carrier,
      trackingNumber,
      trackingUrl: txn.tracking_url_provider ?? carrierTrackingUrl(carrier, trackingNumber),
    });
    await sendEmail({
      to: order.email,
      ...tpl,
      template: "shipment",
      meta: { orderId, trackingNumber },
    });
  }

  return { ok: true, shipmentId: shipment.id, trackingNumber };
}

/** Void/refund a purchased label through Shippo and mark the shipment voided. */
export async function voidLabelForShipment(
  shipmentId: string,
  actorId?: string | null,
): Promise<{ ok: boolean; error?: string }> {
  const shipment = await prisma.shipment.findUnique({ where: { id: shipmentId } });
  if (!shipment) return { ok: false, error: "Shipment not found." };
  if (!shipment.shippoTransactionId) {
    return { ok: false, error: "This shipment has no Shippo label to void." };
  }
  try {
    await refundLabel(shipment.shippoTransactionId);
  } catch (e) {
    return { ok: false, error: `Shippo refund failed: ${(e as Error).message}` };
  }
  await prisma.shipment.update({
    where: { id: shipmentId },
    data: { voidedAt: new Date(), status: "EXCEPTION" },
  });
  await prisma.orderEvent.create({
    data: {
      orderId: shipment.orderId,
      type: "shipment",
      message: `Shipping label voided (${shipment.carrier} ${shipment.trackingNumber ?? ""})`,
      visibleToCustomer: false,
      createdById: actorId ?? null,
    },
  });
  return { ok: true };
}

/**
 * Buy labels for many orders in one call (app-level batch). Sequential to keep
 * Shippo rate limits happy; returns a per-order outcome list.
 */
export async function batchCreateLabels(
  orderIds: string[],
  actorId?: string | null,
): Promise<{ orderId: string; result: LabelResult }[]> {
  const out: { orderId: string; result: LabelResult }[] = [];
  for (const orderId of orderIds) {
    out.push({ orderId, result: await createLabelForOrder(orderId, { actorId }) });
  }
  return out;
}

// ── Webhook-driven status sync ──────────────────────────────────────────────

const SHIPPO_STATUS_MAP: Record<string, "IN_TRANSIT" | "DELIVERED" | "EXCEPTION"> = {
  TRANSIT: "IN_TRANSIT",
  PRE_TRANSIT: "IN_TRANSIT",
  DELIVERED: "DELIVERED",
  RETURNED: "EXCEPTION",
  FAILURE: "EXCEPTION",
  UNKNOWN: "IN_TRANSIT",
};

/**
 * Apply a Shippo track_updated event to the matching shipment: sync status,
 * complete the order + email the customer on delivery. Safe to call repeatedly.
 */
export async function applyTrackingUpdate(input: {
  trackingNumber: string;
  shippoStatus: string;
}): Promise<{ matched: boolean }> {
  const mapped = SHIPPO_STATUS_MAP[input.shippoStatus?.toUpperCase()] ?? null;
  if (!mapped) return { matched: false };

  const shipment = await prisma.shipment.findFirst({
    where: { trackingNumber: input.trackingNumber },
    orderBy: { createdAt: "desc" },
  });
  if (!shipment) return { matched: false };

  const wasDelivered = shipment.status === "DELIVERED";
  await prisma.shipment.update({
    where: { id: shipment.id },
    data: {
      status: mapped,
      deliveredAt:
        mapped === "DELIVERED" ? shipment.deliveredAt ?? new Date() : shipment.deliveredAt,
    },
  });

  if (mapped === "DELIVERED" && !wasDelivered) {
    const order = await prisma.order.findUnique({ where: { id: shipment.orderId } });
    if (order && order.status === "SHIPPED") {
      await prisma.order.update({ where: { id: order.id }, data: { status: "DELIVERED" } });
      await prisma.orderEvent.create({
        data: {
          orderId: order.id,
          type: "shipment",
          message: "Package delivered (Shippo tracking)",
          visibleToCustomer: true,
        },
      });
      const tpl = deliveredEmail({ orderNumber: order.orderNumber });
      await sendEmail({
        to: order.email,
        ...tpl,
        template: "delivered",
        meta: { orderId: order.id },
      });
    }
  }

  return { matched: true };
}
