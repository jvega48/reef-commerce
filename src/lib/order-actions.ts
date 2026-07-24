"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Stripe from "stripe";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { refundEmail, shipmentEmail, orderStatusEmail } from "@/lib/email-templates";
import { trackingUrl, ORDER_STATUS_LABELS } from "@/lib/tracking";
import { formatMoney } from "@/lib/format";
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
// Timeline
// ---------------------------------------------------------------------------

export async function logOrderEvent(
  orderId: string,
  type: string,
  message: string,
  opts: { visibleToCustomer?: boolean; createdById?: string | null } = {},
) {
  await prisma.orderEvent.create({
    data: {
      orderId,
      type,
      message,
      visibleToCustomer: opts.visibleToCustomer ?? true,
      createdById: opts.createdById ?? null,
    },
  });
}

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

  const round = (n: number) => Math.round(n * 100) / 100;
  const subtotal = round(
    lines.reduce((sum, l) => sum + Number(l.product.price) * l.quantity, 0),
  );
  const discount = Math.min(num(formData, "discount"), subtotal);
  const shippingCost = num(formData, "shippingCost");
  const tax = num(formData, "tax");
  const total = round(Math.max(0, subtotal - discount + shippingCost + tax));
  const status =
    (["PENDING", "PAID", "PACKING"] as const).find(
      (s) => s === String(formData.get("status")),
    ) ?? "PACKING";

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
          data: { quantity: 0, status: "SOLD", soldCount: { increment: 1 } },
        });
      } else {
        await tx.product.update({
          where: { id: l.product.id },
          data: {
            quantity: { decrement: l.quantity },
            soldCount: { increment: l.quantity },
          },
        });
      }
    }

    await tx.orderEvent.create({
      data: {
        orderId: order.id,
        type: "status",
        message: `Order created by staff (${ORDER_STATUS_LABELS[status] ?? status})`,
        createdById: session.user.id,
      },
    });
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
// Status lifecycle
// PENDING → PAID → PACKING → READY_TO_SHIP → SHIPPED → DELIVERED
// (CANCELLED / REFUNDED / PARTIALLY_REFUNDED are terminal side-branches.)
// ---------------------------------------------------------------------------

const ALL_STATUSES: OrderStatus[] = [
  "PENDING", "PAID", "PACKING", "READY_TO_SHIP", "SHIPPED", "DELIVERED",
  "CANCELLED", "REFUNDED", "PARTIALLY_REFUNDED",
];

// Statuses the customer is emailed about when entered.
const NOTIFY_STATUSES: OrderStatus[] = ["READY_TO_SHIP", "DELIVERED", "CANCELLED"];

export async function updateOrderStatus(formData: FormData) {
  const session = await requireOrderStaff();
  const orderId = String(formData.get("orderId") ?? "");
  const status = ALL_STATUSES.find((s) => s === String(formData.get("status")));
  if (!orderId || !status) return;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { user: true },
  });
  if (!order || order.status === status) return;

  await prisma.order.update({ where: { id: orderId }, data: { status } });
  await logOrderEvent(
    orderId,
    "status",
    `Status changed: ${ORDER_STATUS_LABELS[order.status]} → ${ORDER_STATUS_LABELS[status]}`,
    { createdById: session.user.id },
  );
  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "order.status",
      entity: `Order:${orderId}`,
      detail: { from: order.status, to: status },
    },
  });

  if (
    NOTIFY_STATUSES.includes(status) &&
    (order.user?.notifyOrderUpdates ?? true)
  ) {
    const tpl = orderStatusEmail({
      orderNumber: order.orderNumber,
      statusLabel: ORDER_STATUS_LABELS[status] ?? status,
    });
    await sendEmail({
      to: order.email,
      ...tpl,
      template: "order-status",
      meta: { orderId, status },
    });
  }

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
  revalidatePath("/admin/packing");
}

/** One-click advance used by the packing queue buttons. */
export async function advanceOrder(formData: FormData) {
  const next: Partial<Record<OrderStatus, OrderStatus>> = {
    PAID: "PACKING",
    PACKING: "READY_TO_SHIP",
  };
  const session = await requireOrderStaff();
  const orderId = String(formData.get("orderId") ?? "");
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  const to = order && next[order.status];
  if (!order || !to) return;

  await prisma.order.update({ where: { id: orderId }, data: { status: to } });
  await logOrderEvent(
    orderId,
    "status",
    `Status changed: ${ORDER_STATUS_LABELS[order.status]} → ${ORDER_STATUS_LABELS[to]}`,
    { createdById: session.user.id },
  );
  revalidatePath("/admin/packing");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
}

// ---------------------------------------------------------------------------
// Cancel & refund
// ---------------------------------------------------------------------------

export async function cancelOrder(formData: FormData) {
  const session = await requireOrderStaff();
  const orderId = String(formData.get("orderId") ?? "");
  const restock = formData.get("restock") === "on";
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) return;
  if (["CANCELLED", "REFUNDED", "SHIPPED", "DELIVERED"].includes(order.status)) return;

  await prisma.$transaction(async (tx) => {
    await tx.order.update({ where: { id: orderId }, data: { status: "CANCELLED" } });
    if (restock && order.status !== "PENDING") {
      // PENDING web orders never decremented stock; everything else did.
      for (const item of order.items) {
        if (!item.productId) continue;
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) continue;
        const reviveWysiwyg =
          product.inventoryMode === "WYSIWYG" && product.status === "SOLD";
        await tx.product.update({
          where: { id: product.id },
          data: {
            quantity: { increment: item.quantity },
            soldCount: { decrement: item.quantity },
            // Revive one-of-a-kind listings that were auto-marked SOLD.
            ...(reviveWysiwyg ? { status: "ACTIVE" as const } : {}),
          },
        });
      }
    }
  });

  await logOrderEvent(orderId, "status", "Order cancelled", {
    createdById: session.user.id,
  });
  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "order.cancel",
      entity: `Order:${orderId}`,
      detail: { restock },
    },
  });
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
  revalidatePath("/shop");
}

export async function refundOrder(formData: FormData) {
  const session = await requireOrderStaff();
  const orderId = String(formData.get("orderId") ?? "");
  const reason = str(formData, "reason");
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return;

  const maxRefundable = Number(order.total) - Number(order.refundAmount);
  const amount = Math.min(num(formData, "amount", maxRefundable), maxRefundable);
  if (amount <= 0) return;

  // Real refund through Stripe when the order was paid there.
  if (order.stripePaymentIntentId && process.env.STRIPE_SECRET_KEY) {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    await stripe.refunds.create({
      payment_intent: order.stripePaymentIntentId,
      amount: Math.round(amount * 100),
    });
  }

  const newRefundTotal = Number(order.refundAmount) + amount;
  const fullyRefunded = newRefundTotal >= Number(order.total) - 0.005;
  await prisma.order.update({
    where: { id: orderId },
    data: {
      refundAmount: newRefundTotal,
      refundReason: reason ?? order.refundReason,
      status: fullyRefunded ? "REFUNDED" : "PARTIALLY_REFUNDED",
    },
  });

  await logOrderEvent(
    orderId,
    "refund",
    `Refund issued: ${formatMoney(amount)}${reason ? ` — ${reason}` : ""}`,
    { createdById: session.user.id },
  );
  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "order.refund",
      entity: `Order:${orderId}`,
      detail: { amount, reason },
    },
  });

  const tpl = refundEmail({
    orderNumber: order.orderNumber,
    amount: formatMoney(amount),
    reason,
  });
  await sendEmail({ to: order.email, ...tpl, template: "refund", meta: { orderId } });

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
}

// ---------------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------------

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
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { user: true },
  });
  if (!order) return;

  // Until shipping-provider API credentials are configured, blank tracking
  // numbers get a clearly-fake placeholder so the flow can be exercised.
  const trackingNumber =
    str(formData, "trackingNumber") ??
    `1ZDEV${randomBytes(6).toString("hex").toUpperCase()}`;
  const carrier = str(formData, "carrier") ?? "UPS";

  const markShipped = formData.get("markShipped") === "on";

  await prisma.shipment.create({
    data: {
      orderId,
      carrier,
      service: str(formData, "service"),
      trackingNumber,
      cost: str(formData, "cost") ? num(formData, "cost") : null,
      status: markShipped ? "IN_TRANSIT" : "LABEL_CREATED",
      shippedAt: markShipped ? new Date() : null,
    },
  });
  await logOrderEvent(
    orderId,
    "shipment",
    markShipped
      ? `Shipped via ${carrier} — tracking ${trackingNumber}`
      : `Shipping label created (${carrier})`,
    { createdById: session.user.id },
  );

  if (
    markShipped &&
    ["PENDING", "PAID", "PACKING", "READY_TO_SHIP"].includes(order.status)
  ) {
    await prisma.order.update({ where: { id: orderId }, data: { status: "SHIPPED" } });
    if (order.user?.notifyOrderUpdates ?? true) {
      const tpl = shipmentEmail({
        orderNumber: order.orderNumber,
        carrier,
        trackingNumber,
        trackingUrl: trackingUrl(carrier, trackingNumber),
      });
      await sendEmail({
        to: order.email,
        ...tpl,
        template: "shipment",
        meta: { orderId, trackingNumber },
      });
    }
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
  revalidatePath("/admin/packing");
}

/** Mark an in-transit shipment delivered (also completes the order). */
export async function markDelivered(formData: FormData) {
  const session = await requireOrderStaff();
  const shipmentId = String(formData.get("shipmentId") ?? "");
  const shipment = await prisma.shipment.findUnique({ where: { id: shipmentId } });
  if (!shipment) return;

  await prisma.shipment.update({
    where: { id: shipmentId },
    data: { status: "DELIVERED", deliveredAt: new Date() },
  });
  const order = await prisma.order.findUnique({ where: { id: shipment.orderId } });
  if (order && order.status === "SHIPPED") {
    await prisma.order.update({
      where: { id: order.id },
      data: { status: "DELIVERED" },
    });
    await logOrderEvent(order.id, "shipment", "Package delivered", {
      createdById: session.user.id,
    });
  }
  revalidatePath(`/admin/orders/${shipment.orderId}`);
  revalidatePath("/admin/orders");
}
