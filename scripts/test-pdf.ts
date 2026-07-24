// PDF generation test: renders all five document types from a synthetic
// order and asserts each produces a valid, non-trivial PDF buffer.
import { buildOrderPdf, type PdfDocType } from "../src/lib/pdf";

const order = {
  orderNumber: 1042,
  createdAt: new Date(),
  email: "customer@example.com",
  status: "PAID",
  isGift: true,
  giftMessage: "Happy reefing! Enjoy the new frags. — J",
  subtotal: 285.5,
  discount: 20,
  shippingCost: 40,
  tax: 0,
  total: 305.5,
  giftCardAmount: 0,
  pointsRedeemed: 0,
  refundAmount: 55,
  refundReason: "DOA claim — zoa colony",
  items: [
    { name: "Rainbow Blastomussa Colony — WYSIWYG #14", sku: "AV-BLASTO-014", quantity: 1, unitPrice: 189.5 },
    { name: "Utter Chaos Zoa Frag (3 polyps)", sku: "AV-ZOA-UC3", quantity: 2, unitPrice: 48 },
  ],
  shippingAddress: {
    name: "Pat Reefer",
    line1: "123 Lagoon Way",
    line2: "Apt 4",
    city: "San Diego",
    state: "CA",
    postalCode: "92101",
    phone: "(555) 555-0134",
  },
  user: { name: "Pat Reefer" },
};

async function main() {
  const types: PdfDocType[] = [
    "invoice",
    "receipt",
    "gift-receipt",
    "refund-receipt",
    "packing-slip",
  ];
  for (const t of types) {
    const buf = await buildOrderPdf(t, order);
    if (buf.subarray(0, 5).toString() !== "%PDF-") {
      throw new Error(`${t}: output is not a PDF`);
    }
    if (buf.length < 2000) {
      throw new Error(`${t}: suspiciously small PDF (${buf.length} bytes)`);
    }
    console.log(`  ✓ ${t} (${(buf.length / 1024).toFixed(1)} KB)`);
  }
  console.log("PDF test passed.");
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error("PDF test FAILED:", e);
    process.exit(1);
  },
);
