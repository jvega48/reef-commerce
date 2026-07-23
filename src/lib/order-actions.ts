"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { OrderStatus, Role } from "@/generated/prisma/client";

const ORDER_ROLES: Role[] = ["OWNER", "ADMIN", "SHIPPING_MANAGER", "SUPPORT"];

async function requireOrderStaff() {
  const session = await auth();
  if (!session?.user || !ORDER_ROLES.includes(session.user.role)) {
    throw new Error("Not authorized to manage orders");
  }
  return session;
}

const num = (fd: FormData, key: string, fallback = 0) => {
  const v = Number(fd.get(key));
  return Number.isFinite(v) && v >= 0 ? v : fallback;
};
const str = (fd: FormData, key: string) => {
  const v = String(fd.get(key) ?? "").trim();
  return v || null;
};

// ---------------------------------------------------------------------------
// Manual order creation (phone/local-pickup/invoice orders)
// ---------------------------------------------------------------------------

export async function createManualOrder(formData: FormData) {
  const session = await requireOrderStaff();

  let requested: { productId: string; quantity: number }[] = [];
  try {
    requested = JSON.parse(String(formData.get("itemsJson") ?? "[]"));
  } catch {
    /* fall through to validation */
  }
  requested = requested.filter((i) => i?.productId && Number(i.quantity) > 0);
  if (requested.length === 0) redirect("/admin/orders/new?error=items");

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) redirect("/admin/orders/new?error=email");

  const products = await prisma.product.findMany({
    where: { id: { in: requested.map((i) => i.productId) } },
    include: { images: { orderBy: { position: "asc" }, take: 1 } },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  const lines = requested.flatMap((i) => {
    const product = byId.get(i.productId);
    if (!product) return [];
    const quantity =
      product.inventoryMode === "WYSIWYG" ? 1 : Math.round(Number(i.quantity));
    return [{ product, quantity }];
  });
  for (const line of lines) {
    if (line.product.quantity < line.quantity) {
      redirect(`/admin/orders/new?error=stock&sku=${line.product.sku}`);
    }
  }

  const subtotal = lines.reduce(
    (sum, l) => sum + Number(l.product.price) * l.quantity,
    0,
  );
  const discount = Math.min(num(formData, "discount"), subtotal);
  const shippingCost = num(formData, "shippingCost");
  const tax = num(formData, "tax");
  const total = Math.max(0, subtotal - discount + shippingCost + tax);
  const status =
    (["PENDING", "PAID", "PROCESSING"] as const).find(
      (s) => s === String(formData.get("status")),
    ) ?? "PROCESSING";

  const customer = await prisma.user.findUnique({ where: { email } });

  const shipName = str(formData, "shipName");
  const line1 = str(formData, "line1");
  const city = str(formData, "city");

  const order = await prisma.$transaction(async (tx) => {
    let shippingAddressId: string | undefined;
    if (line1 && city) {
      const address = await tx.address.create({
        data: {
          userId: customer?.id,
          name: shipName ?? customer?.name ?? email,
          line1,
          line2: str(formData, "line2"),
          city,
          state: str(formData, "state") ?? "",
          postalCode: str(formData, "postalCode") ?? "",
          phone: str(formData, "phone"),
        },
      });
      shippingAddressId = address.id;
    }

    const order = await tx.order.create({
      data: {
        email,
        userId: customer?.id,
        status,
        subtotal,
        discount,
        shippingCost,
        tax,
        total,
        internalNotes: str(formData, "internalNotes"),
        shippingAddressId,
        items: {
          create: lines.map((l) => ({
            productId: l.product.id,
            name: l.product.name,
            sku: l.product.sku,
            unitPrice: l.product.price,
            quantity: l.quantity,
            imageUrl: l.product.images[0]?.url ?? null,
          })),
        },
      },
    });

    // Decrement stock; WYSIWYG specimens are sold outright.
    for (const l of lines) {
      if (l.product.inventoryMode === "WYSIWYG") {
        await tx.product.update({
          where: { id: l.product.id },
          data: { quantity: 0, status: "SOLD" },
        });
      } else {
        await tx.product.update({
          where: { id: l.product.id },
          data: { quantity: { decrement: l.quantity } },
        });
      }
    }
    return order;
  });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "order.create",
      entity: `Order:${order.id}`,
      detail: { orderNumber: order.orderNumber, email, total },
    },
  });

  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  revalidatePath("/shop");
  redirect(`/admin/orders/${order.id}`);
}

// ---------------------------------------------------------------------------
// Status / notes
// ---------------------------------------------------------------------------

const ALL_STATUSES: OrderStatus[] = [
  "PENDING", "PAID", "PROCESSING", "SHIPPED", "DELIVERED",
  "CANCELLED", "REFUNDED", "PARTIALLY_REFUNDED",
];

export async function updateOrderStatus(formData: FormData) {
  const session = await requireOrderStaff();
  const orderId = String(formData.get("orderId") ?? "");
  const status = ALL_STATUSES.find((s) => s === String(formData.get("status")));
  if (!orderId || !status) return;

  await prisma.order.update({ where: { id: orderId }, data: { status } });
  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "order.status",
      entity: `Order:${orderId}`,
      detail: { status },
    },
  });
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
}

export async function saveOrderNotes(formData: FormData) {
  await requireOrderStaff();
  const orderId = String(formData.get("orderId") ?? "");
  if (!orderId) return;
  await prisma.order.update({
    where: { id: orderId },
    data: { internalNotes: str(formData, "internalNotes") },
  });
  revalidatePath(`/admin/orders/${orderId}`);
}

// ---------------------------------------------------------------------------
// Shipments / labels
// ---------------------------------------------------------------------------

export async function addShipment(formData: FormData) {
  const session = await requireOrderStaff();
  const orderId = String(formData.get("orderId") ?? "");
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return;

  // Until UPS API credentials are configured, blank tracking numbers get a
  // clearly-fake placeholder so the fulfillment flow can be exercised.
  const trackingNumber =
    str(formData, "trackingNumber") ??
    `1ZDEV${randomBytes(6).toString("hex").toUpperCase()}`;

  const markShipped = formData.get("markShipped") === "on";

  await prisma.shipment.create({
    data: {
      orderId,
      carrier: str(formData, "carrier") ?? "UPS",
      service: str(formData, "service"),
      trackingNumber,
      cost: str(formData, "cost") ? num(formData, "cost") : null,
      status: markShipped ? "IN_TRANSIT" : "LABEL_CREATED",
      shippedAt: markShipped ? new Date() : null,
    },
  });
  if (markShipped && (order.status === "PAID" || order.status === "PROCESSING" || order.status === "PENDING")) {
    await prisma.order.update({ where: { id: orderId }, data: { status: "SHIPPED" } });
  }

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "shipment.create",
      entity: `Order:${orderId}`,
      detail: { trackingNumber, markShipped },
    },
  });
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
}
