// Shippo integration test. Two parts:
//   1. Pure business-rule helpers (no I/O).
//   2. Full label lifecycle (rate → buy → track → deliver → void) against a
//      MOCKED Shippo API (global fetch is stubbed) using a real DB order.
// Run: npx tsx scripts/test-shippo.ts
import "dotenv/config";

// Force a known state before importing app modules that read env at call time.
process.env.SHIPPO_API_KEY = "shippo_test_UNITTEST";
delete process.env.RESEND_API_KEY; // keep email in CONSOLE mode (no real send)

import { prisma } from "../src/lib/prisma";
import { SHIPPING_DEFAULTS, saveSettingsGroup } from "../src/lib/settings";
import {
  isDeliverableDate,
  nextDeliverableDate,
  isShippableState,
  parcelWeightOz,
  createLabelForOrder,
  voidLabelForShipment,
  applyTrackingUpdate,
} from "../src/lib/shipping";
import { selectRate, type ShippoRate } from "../src/lib/shippo";

let passed = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  passed++;
  console.log(`  ✓ ${msg}`);
}

// ── Mock Shippo API by stubbing global fetch ───────────────────────────────
const realFetch = globalThis.fetch;
function mockResponse(body: unknown) {
  return {
    ok: true,
    status: 200,
    text: async () => JSON.stringify(body),
  } as Response;
}
globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
  const u = String(url);
  const method = (init?.method ?? "GET").toUpperCase();
  if (!u.includes("api.goshippo.com")) {
    throw new Error(`Unexpected non-Shippo fetch in test: ${u}`);
  }
  if (u.includes("/shipments/") && method === "POST") {
    return mockResponse({
      object_id: "shp_1",
      status: "SUCCESS",
      rates: [
        {
          object_id: "rate_ground",
          amount: "12.30",
          currency: "USD",
          provider: "FedEx",
          servicelevel: { token: "fedex_ground", name: "FedEx Ground" },
          estimated_days: 4,
        },
        {
          object_id: "rate_overnight",
          amount: "68.45",
          currency: "USD",
          provider: "FedEx",
          servicelevel: {
            token: "fedex_priority_overnight",
            name: "FedEx Priority Overnight",
          },
          estimated_days: 1,
        },
      ],
    });
  }
  if (u.includes("/transactions/") && method === "POST") {
    return mockResponse({
      object_id: "txn_1",
      status: "SUCCESS",
      tracking_number: "794600000001",
      tracking_url_provider: "https://www.fedex.com/track?794600000001",
      label_url: "https://shippo-delivery.s3.amazonaws.com/label_1.pdf",
      eta: "2026-08-01T00:00:00Z",
      rate: "rate_overnight",
    });
  }
  if (u.includes("/tracks/") && method === "POST") return mockResponse({});
  if (u.includes("/refunds/") && method === "POST") {
    return mockResponse({ object_id: "ref_1", status: "QUEUED" });
  }
  throw new Error(`Unmocked Shippo call: ${method} ${u}`);
}) as typeof fetch;

async function main() {
  // ── Part 1: pure business rules ──────────────────────────────────────────
  const cfg = {
    ...SHIPPING_DEFAULTS,
    shipDays: [2, 3], // Tue, Wed
    blackoutDates: ["2026-12-25"],
    excludedStates: ["HI", "AK", "PR"],
  };

  // Find a real Tuesday and a real Sunday deterministically.
  const tuesday = "2026-08-04"; // 2026-08-04 is a Tuesday
  const sunday = "2026-08-02"; // 2026-08-02 is a Sunday
  assert(new Date(`${tuesday}T12:00:00`).getDay() === 2, "fixture 2026-08-04 is a Tuesday");
  assert(isDeliverableDate(tuesday, cfg) === true, "Tuesday is a deliverable ship day");
  assert(isDeliverableDate(sunday, cfg) === false, "Sunday is not a ship day");
  assert(isDeliverableDate("2026-12-25", cfg) === false, "blackout date is not deliverable");
  assert(cfg.shipDays.includes(new Date(`${nextDeliverableDate(cfg, new Date(sunday))}T12:00:00`).getDay()), "nextDeliverableDate lands on a ship day");

  assert(isShippableState("CA", cfg) === true, "CA is shippable");
  assert(isShippableState("HI", cfg) === false, "HI is excluded (no shipping)");
  assert(isShippableState("hi", cfg) === false, "state exclusion is case-insensitive");

  assert(parcelWeightOz([{ grams: 0, quantity: 1 }], cfg) === cfg.parcelTareOz, "empty parcel = tare weight");
  const w = parcelWeightOz([{ grams: 453.592, quantity: 2 }], cfg); // 2 lb of product
  assert(Math.abs(w - (cfg.parcelTareOz + 32)) < 0.5, "product weight adds to tare (2lb → +32oz)");
  assert(parcelWeightOz([], cfg) >= 1, "parcel weight never below 1oz");

  const rates: ShippoRate[] = [
    { object_id: "a", amount: "12.30", currency: "USD", provider: "FedEx", servicelevel: { token: "fedex_ground", name: "Ground" }, estimated_days: 4 },
    { object_id: "b", amount: "68.45", currency: "USD", provider: "FedEx", servicelevel: { token: "fedex_priority_overnight", name: "Overnight" }, estimated_days: 1 },
  ];
  assert(selectRate(rates, "fedex_priority_overnight")?.object_id === "b", "selectRate honors preferred service token");
  assert(selectRate(rates, "nonexistent")?.object_id === "b", "selectRate falls back to overnight (≤1 day)");
  assert(selectRate([], "x") === null, "selectRate returns null with no rates");

  // ── Part 2: full label lifecycle against mocked Shippo ────────────────────
  const owner = await prisma.user.findUnique({ where: { email: "vegajose4849@gmail.com" } });
  const product = await prisma.product.findFirst({ where: { status: "ACTIVE" } });
  if (!owner || !product) throw new Error("need seeded owner + product");

  // Ensure ship-from is configured (createLabelForOrder requires it).
  const savedShipping = await prisma.storeSetting.findUnique({ where: { key: "shipping" } });
  await saveSettingsGroup("shipping", {
    ...(savedShipping?.value as object),
    shipFromName: "AquaVida365 Test",
    shipFromStreet1: "123 Test St",
    shipFromCity: "Los Angeles",
    shipFromState: "CA",
    shipFromZip: "90001",
    shipFromCountry: "US",
    defaultServiceToken: "fedex_priority_overnight",
    excludedStates: ["HI", "AK", "PR"],
  });

  const order = await prisma.order.create({
    data: {
      email: owner.email,
      user: { connect: { id: owner.id } },
      status: "PAID",
      subtotal: 100,
      shippingCost: 60,
      total: 160,
      shippingAddress: {
        create: {
          name: "Test Buyer",
          line1: "500 Ocean Ave",
          city: "Santa Monica",
          state: "CA",
          postalCode: "90401",
          country: "US",
        },
      },
      items: {
        create: [{
          productId: product.id,
          name: product.name,
          sku: product.sku,
          unitPrice: product.price,
          quantity: 1,
        }],
      },
    },
  });
  const testStart = new Date();

  // Buy the label.
  const result = await createLabelForOrder(order.id, { actorId: owner.id });
  assert(result.ok === true, "createLabelForOrder succeeds");
  assert(result.ok && result.trackingNumber === "794600000001", "tracking number captured from Shippo");

  const shipment = await prisma.shipment.findFirst({ where: { orderId: order.id } });
  assert(!!shipment, "shipment row created");
  assert(shipment!.carrier === "FedEx", "carrier stored");
  assert(shipment!.service === "FedEx Priority Overnight", "overnight service selected (not ground)");
  assert(shipment!.labelUrl?.endsWith("label_1.pdf") === true, "label URL stored");
  assert(Number(shipment!.cost) === 68.45, "label cost stored");
  assert(shipment!.shippoTransactionId === "txn_1", "Shippo transaction id stored (for void)");
  assert(shipment!.status === "IN_TRANSIT", "shipment marked in transit");

  const afterBuy = await prisma.order.findUnique({ where: { id: order.id } });
  assert(afterBuy!.status === "SHIPPED", "order advanced to SHIPPED");

  const shipEmail = await prisma.emailLog.findFirst({
    where: { template: "shipment", createdAt: { gte: testStart } },
    orderBy: { createdAt: "desc" },
  });
  assert(!!shipEmail, "shipment/tracking email logged to customer");

  // Idempotency: a second buy returns the existing label, no duplicate.
  const again = await createLabelForOrder(order.id, { actorId: owner.id });
  assert(again.ok === true && again.alreadyExisted === true, "second buy is idempotent (no duplicate label)");
  assert((await prisma.shipment.count({ where: { orderId: order.id } })) === 1, "still exactly one shipment");

  // Delivery via tracking webhook.
  const delivered = await applyTrackingUpdate({ trackingNumber: "794600000001", shippoStatus: "DELIVERED" });
  assert(delivered.matched === true, "tracking update matched the shipment");
  const afterDelivery = await prisma.order.findUnique({ where: { id: order.id } });
  assert(afterDelivery!.status === "DELIVERED", "order advanced to DELIVERED via webhook");
  const delEmail = await prisma.emailLog.findFirst({
    where: { template: "delivered", createdAt: { gte: testStart } },
  });
  assert(!!delEmail, "delivery-confirmation email logged");

  // Void the label.
  const voided = await voidLabelForShipment(shipment!.id, owner.id);
  assert(voided.ok === true, "voidLabelForShipment succeeds");
  const afterVoid = await prisma.shipment.findUnique({ where: { id: shipment!.id } });
  assert(!!afterVoid!.voidedAt, "shipment marked voided");

  // ── Cleanup ──────────────────────────────────────────────────────────────
  await prisma.emailLog.deleteMany({
    where: { template: { in: ["shipment", "delivered"] }, createdAt: { gte: testStart } },
  });
  await prisma.order.delete({ where: { id: order.id } }); // cascades shipments + events
  if (savedShipping) {
    await saveSettingsGroup("shipping", savedShipping.value as object);
  } else {
    await prisma.storeSetting.delete({ where: { key: "shipping" } }).catch(() => {});
  }
  globalThis.fetch = realFetch;
  console.log(`Shippo test passed. (${passed} assertions)`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
