import { NextRequest, NextResponse } from "next/server";
import { auth, STAFF_ROLES } from "@/auth";
import { prisma } from "@/lib/prisma";
import { toCsv } from "@/lib/csv";

// CSV exports for products / orders / customers. Staff only.

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !STAFF_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const what = req.nextUrl.searchParams.get("what") ?? "products";
  let rows: (string | number | null)[][];
  let filename: string;

  if (what === "orders") {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      include: { items: true },
    });
    rows = [
      ["Order #", "Date", "Status", "Email", "Items", "Subtotal", "Discount", "Shipping", "Tax", "Total", "Refunded"],
      ...orders.map((o) => [
        o.orderNumber,
        o.createdAt.toISOString(),
        o.status,
        o.email,
        o.items.reduce((n, i) => n + i.quantity, 0),
        Number(o.subtotal),
        Number(o.discount),
        Number(o.shippingCost),
        Number(o.tax),
        Number(o.total),
        Number(o.refundAmount),
      ]),
    ];
    filename = "orders";
  } else if (what === "customers") {
    const users = await prisma.user.findMany({
      where: { role: "CUSTOMER" },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { orders: true } } },
    });
    rows = [
      ["Email", "Name", "Phone", "Reef Points", "VIP Tier", "Orders", "Marketing Opt-In", "Joined"],
      ...users.map((u) => [
        u.email,
        u.name ?? "",
        u.phone ?? "",
        u.reefPoints,
        u.vipTier,
        u._count.orders,
        u.marketingOptIn ? "yes" : "no",
        u.createdAt.toISOString(),
      ]),
    ];
    filename = "customers";
  } else {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: "desc" },
      include: { categories: { include: { category: true } } },
    });
    rows = [
      ["SKU", "Name", "Slug", "Status", "Type", "Inventory Mode", "Price", "Compare At", "Cost", "Quantity", "Sold", "Vendor", "Rating", "Categories"],
      ...products.map((p) => [
        p.sku,
        p.name,
        p.slug,
        p.status,
        p.livestockType,
        p.inventoryMode,
        Number(p.price),
        p.compareAtPrice != null ? Number(p.compareAtPrice) : "",
        p.cost != null ? Number(p.cost) : "",
        p.quantity,
        p.soldCount,
        p.vendor ?? "",
        Number(p.ratingAvg),
        p.categories.map((c) => c.category.name).join("; "),
      ]),
    ];
    filename = "products";
  }

  const csv = "﻿" + toCsv(rows); // BOM so Excel reads UTF-8
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="aquavida365-${filename}-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
