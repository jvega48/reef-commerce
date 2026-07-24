import { NextRequest, NextResponse } from "next/server";
import { auth, STAFF_ROLES } from "@/auth";
import { prisma } from "@/lib/prisma";
import { buildOrderPdf, type PdfDocType } from "@/lib/pdf";

const DOC_TYPES: PdfDocType[] = [
  "invoice",
  "receipt",
  "gift-receipt",
  "refund-receipt",
  "packing-slip",
];

// Staff-only document types; customers get invoices/receipts for their own
// orders but never the internal packing slip.
const STAFF_ONLY: PdfDocType[] = ["packing-slip"];

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const docParam = req.nextUrl.searchParams.get("doc") ?? "invoice";
  const docType = DOC_TYPES.find((d) => d === docParam);
  if (!docType) {
    return NextResponse.json({ error: "Unknown document type" }, { status: 400 });
  }

  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: true,
      shippingAddress: true,
      user: { select: { name: true } },
    },
  });
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const isStaff = STAFF_ROLES.includes(session.user.role);
  const isOwner =
    order.userId === session.user.id ||
    order.email.toLowerCase() === session.user.email?.toLowerCase();
  if (!isStaff && !isOwner) {
    return NextResponse.json({ error: "Not your order" }, { status: 403 });
  }
  if (STAFF_ONLY.includes(docType) && !isStaff) {
    return NextResponse.json({ error: "Staff only" }, { status: 403 });
  }
  if (docType === "refund-receipt" && Number(order.refundAmount) <= 0) {
    return NextResponse.json({ error: "No refund on this order" }, { status: 400 });
  }

  const pdf = await buildOrderPdf(docType, order);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="aquavida365-${docType}-${order.orderNumber}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
