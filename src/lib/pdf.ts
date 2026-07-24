import path from "node:path";
import fs from "node:fs";
import PDFDocument from "pdfkit";
import { formatMoney, formatDate } from "./format";

// ---------------------------------------------------------------------------
// Branded PDF documents: invoice, receipt, gift receipt, refund receipt, and
// packing slip — all built from one order shape so every download route and
// email attachment renders identically. Print-first palette (white paper,
// brand teal/coral accents), US Letter.
// ---------------------------------------------------------------------------

export type PdfDocType =
  | "invoice"
  | "receipt"
  | "gift-receipt"
  | "refund-receipt"
  | "packing-slip";

export interface PdfOrder {
  orderNumber: number;
  createdAt: Date;
  email: string;
  status: string;
  isGift: boolean;
  giftMessage: string | null;
  subtotal: unknown;
  discount: unknown;
  shippingCost: unknown;
  tax: unknown;
  total: unknown;
  giftCardAmount: unknown;
  pointsRedeemed: number;
  refundAmount: unknown;
  refundReason: string | null;
  items: {
    name: string;
    sku: string;
    quantity: number;
    unitPrice: unknown;
  }[];
  shippingAddress: {
    name: string;
    line1: string;
    line2: string | null;
    city: string;
    state: string;
    postalCode: string;
    phone: string | null;
  } | null;
  user?: { name: string | null } | null;
}

const TEAL = "#0e7f8f";
const CORAL = "#e85c44";
const INK = "#1a2733";
const MUTED = "#5b6b7b";
const RULE = "#d7dee5";

const TITLES: Record<PdfDocType, string> = {
  invoice: "INVOICE",
  receipt: "RECEIPT",
  "gift-receipt": "GIFT RECEIPT",
  "refund-receipt": "REFUND RECEIPT",
  "packing-slip": "PACKING SLIP",
};

const M = 54; // page margin
const W = 612 - M * 2; // usable width on US Letter

export async function buildOrderPdf(
  docType: PdfDocType,
  order: PdfOrder,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "LETTER",
      margin: M,
      info: {
        Title: `AquaVida365 ${TITLES[docType]} — Order #${order.orderNumber}`,
        Author: "AquaVida365",
      },
    });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    try {
      render(doc, docType, order);
      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}

function render(doc: PDFKit.PDFDocument, docType: PdfDocType, order: PdfOrder) {
  const showPrices = docType !== "gift-receipt" && docType !== "packing-slip";

  // ── Header band ──────────────────────────────────────────────────────────
  doc.rect(0, 0, 612, 6).fill(TEAL);
  doc.rect(0, 6, 612, 2).fill(CORAL);

  const logoPath = path.join(process.cwd(), "public", "brand", "logo-mark.png");
  let x = M;
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, M, 30, { width: 42, height: 42 });
    x = M + 52;
  }
  doc.font("Helvetica-Bold").fontSize(20).fillColor(TEAL).text("Aqua", x, 38, { continued: true });
  doc.fillColor(CORAL).text("Vida", { continued: true });
  doc.fontSize(10).fillColor(MUTED).text("365");
  doc.font("Helvetica").fontSize(8.5).fillColor(MUTED)
    .text("Premium corals & saltwater livestock", x, 62);

  doc.font("Helvetica-Bold").fontSize(17).fillColor(INK)
    .text(TITLES[docType], M, 38, { width: W, align: "right" });
  doc.font("Helvetica").fontSize(9.5).fillColor(MUTED)
    .text(`Order #${order.orderNumber}`, M, 60, { width: W, align: "right" })
    .text(formatDate(order.createdAt), M, 72, { width: W, align: "right" });

  doc.moveTo(M, 96).lineTo(612 - M, 96).lineWidth(0.75).strokeColor(RULE).stroke();

  // ── Address / meta block ─────────────────────────────────────────────────
  let y = 112;
  doc.font("Helvetica-Bold").fontSize(8).fillColor(MUTED)
    .text(docType === "packing-slip" ? "SHIP TO" : "BILLED TO", M, y);
  doc.font("Helvetica").fontSize(10).fillColor(INK);
  const a = order.shippingAddress;
  let leftLines: string[];
  if (a) {
    leftLines = [
      a.name,
      a.line1,
      ...(a.line2 ? [a.line2] : []),
      `${a.city}, ${a.state} ${a.postalCode}`,
      ...(a.phone ? [a.phone] : []),
    ];
  } else {
    leftLines = [order.user?.name ?? order.email, "Local pickup"];
  }
  doc.text(leftLines.join("\n"), M, y + 12, { width: W / 2 - 10, lineGap: 1.5 });

  doc.font("Helvetica-Bold").fontSize(8).fillColor(MUTED)
    .text("ORDER DETAILS", M + W / 2, y);
  doc.font("Helvetica").fontSize(10).fillColor(INK).text(
    [
      `Order: #${order.orderNumber}`,
      `Placed: ${formatDate(order.createdAt)}`,
      ...(docType === "packing-slip" || docType === "gift-receipt"
        ? []
        : [`Email: ${order.email}`]),
      `Status: ${order.status.replace(/_/g, " ").toLowerCase()}`,
    ].join("\n"),
    M + W / 2,
    y + 12,
    { width: W / 2, lineGap: 1.5 },
  );

  y = Math.max(doc.y + 18, 186);

  // ── Gift message (gift receipt only) ─────────────────────────────────────
  if (docType === "gift-receipt" && order.giftMessage) {
    doc.roundedRect(M, y, W, 46, 6).lineWidth(0.75).strokeColor(CORAL).stroke();
    doc.font("Helvetica-Oblique").fontSize(10).fillColor(INK)
      .text(`“${order.giftMessage}”`, M + 14, y + 10, { width: W - 28, height: 30, ellipsis: true });
    y = y + 58;
  }

  // ── Items table ──────────────────────────────────────────────────────────
  const cols = showPrices
    ? [
        { label: "ITEM", w: W * 0.46, align: "left" as const },
        { label: "SKU", w: W * 0.18, align: "left" as const },
        { label: "QTY", w: W * 0.08, align: "right" as const },
        { label: "PRICE", w: W * 0.13, align: "right" as const },
        { label: "TOTAL", w: W * 0.15, align: "right" as const },
      ]
    : [
        { label: "ITEM", w: W * 0.6, align: "left" as const },
        { label: "SKU", w: W * 0.28, align: "left" as const },
        { label: "QTY", w: W * 0.12, align: "right" as const },
      ];

  doc.rect(M, y, W, 20).fill("#eef3f6");
  let cx = M;
  doc.font("Helvetica-Bold").fontSize(8).fillColor(MUTED);
  for (const col of cols) {
    doc.text(col.label, cx + 6, y + 6, { width: col.w - 12, align: col.align });
    cx += col.w;
  }
  y += 20;

  doc.font("Helvetica").fontSize(9.5);
  for (const item of order.items) {
    if (y > 660) {
      doc.addPage();
      y = M;
    }
    const cells = showPrices
      ? [
          item.name,
          item.sku,
          String(item.quantity),
          formatMoney(item.unitPrice as number),
          formatMoney(Number(item.unitPrice) * item.quantity),
        ]
      : [item.name, item.sku, String(item.quantity)];

    const rowH = Math.max(
      18,
      doc.heightOfString(cells[0], { width: cols[0].w - 12 }) + 8,
    );
    cx = M;
    cells.forEach((cell, i) => {
      doc.fillColor(i === 0 ? INK : MUTED);
      doc.text(cell, cx + 6, y + 5, { width: cols[i].w - 12, align: cols[i].align });
      cx += cols[i].w;
    });
    y += rowH;
    doc.moveTo(M, y).lineTo(612 - M, y).lineWidth(0.5).strokeColor(RULE).stroke();
  }

  // ── Totals (price-bearing docs) ──────────────────────────────────────────
  if (showPrices) {
    y += 10;
    const totals: [string, string, boolean][] = [
      ["Subtotal", formatMoney(order.subtotal as number), false],
    ];
    if (Number(order.discount) > 0)
      totals.push(["Discount", `−${formatMoney(order.discount as number)}`, false]);
    if (Number(order.giftCardAmount) > 0)
      totals.push(["Gift card", `−${formatMoney(order.giftCardAmount as number)}`, false]);
    if (order.pointsRedeemed > 0)
      totals.push([
        `Reef Points (${order.pointsRedeemed.toLocaleString()})`,
        `−${formatMoney(order.pointsRedeemed / 100)}`,
        false,
      ]);
    totals.push(["Shipping", formatMoney(order.shippingCost as number), false]);
    totals.push(["Tax", formatMoney(order.tax as number), false]);
    totals.push(["Total", formatMoney(order.total as number), true]);
    if (docType === "refund-receipt") {
      totals.push([
        `Refunded${order.refundReason ? ` — ${order.refundReason}` : ""}`,
        `−${formatMoney(order.refundAmount as number)}`,
        true,
      ]);
    }

    const tw = 220;
    const tx = 612 - M - tw;
    for (const [label, value, strong] of totals) {
      if (y > 700) {
        doc.addPage();
        y = M;
      }
      doc.font(strong ? "Helvetica-Bold" : "Helvetica").fontSize(strong ? 11 : 9.5);
      const isRefund = strong && label.startsWith("Refunded");
      doc.fillColor(isRefund ? CORAL : strong ? INK : MUTED);
      doc.text(label, tx, y, { width: tw - 80 });
      doc.text(value, tx + tw - 80, y, { width: 80, align: "right" });
      y += strong ? 20 : 15;
      if (strong) {
        doc.moveTo(tx, y - 4).lineTo(612 - M, y - 4).lineWidth(0.5).strokeColor(RULE).stroke();
      }
    }
  }

  // ── Packing-slip checklist ───────────────────────────────────────────────
  if (docType === "packing-slip") {
    y += 14;
    doc.roundedRect(M, y, W, 58, 6).lineWidth(0.75).strokeColor(TEAL).stroke();
    doc.font("Helvetica-Bold").fontSize(9).fillColor(TEAL).text("PACKER CHECKLIST", M + 12, y + 8);
    doc.font("Helvetica").fontSize(8.5).fillColor(INK).text(
      "☐ Bags double-sealed    ☐ Heat / cold pack added    ☐ Insulated liner    " +
        "☐ Acclimation guide included    ☐ Box label matches order #",
      M + 12,
      y + 24,
      { width: W - 24, lineGap: 3 },
    );
    y += 70;
  }

  // ── Footer ───────────────────────────────────────────────────────────────
  const fy = 730;
  doc.moveTo(M, fy - 10).lineTo(612 - M, fy - 10).lineWidth(0.5).strokeColor(RULE).stroke();
  doc.font("Helvetica").fontSize(8).fillColor(MUTED).text(
    docType === "gift-receipt"
      ? "This gift receipt intentionally shows no prices. Questions or exchanges: reply to your gift notification email."
      : "Every specimen is covered by our live-arrival guarantee — unbox on camera within 2 hours of delivery. " +
          "Questions? Visit your account page or contact support.",
    M,
    fy,
    { width: W, align: "center" },
  );
  doc.font("Helvetica-Bold").fontSize(8).fillColor(TEAL).text(
    (process.env.NEXT_PUBLIC_SITE_URL ?? "aquavida365.com").replace(/^https?:\/\//, ""),
    M,
    fy + 22,
    { width: W, align: "center" },
  );
}
