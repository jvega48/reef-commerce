import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { abandonedCartEmail } from "@/lib/email-templates";
import { formatMoney } from "@/lib/format";

// Abandoned-cart recovery sweep. Call on a schedule (Vercel Cron or any
// external pinger):  GET /api/cron/recover-carts  with
// "Authorization: Bearer $CRON_SECRET" (or Vercel Cron's signature header).
//
// Targets carts that (a) have items, (b) captured an email at checkout,
// (c) went stale 4+ hours ago, and (d) haven't been emailed yet. One email
// per cart, ever — recovery nags kill brands.

export const dynamic = "force-dynamic";

const STALE_AFTER_MS = 4 * 60 * 60 * 1000; // 4h
const GIVE_UP_AFTER_MS = 14 * 24 * 60 * 60 * 1000; // 14d

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  const isVercelCron = req.headers.get("x-vercel-cron") !== null;
  if (!secret || (auth !== `Bearer ${secret}` && !isVercelCron)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = Date.now();
  const carts = await prisma.cart.findMany({
    where: {
      email: { not: null },
      recoveryEmailSentAt: null,
      recoveredAt: null,
      updatedAt: {
        lt: new Date(now - STALE_AFTER_MS),
        gt: new Date(now - GIVE_UP_AFTER_MS),
      },
      items: { some: {} },
    },
    include: {
      items: {
        include: {
          product: { select: { name: true, price: true, status: true, quantity: true } },
        },
      },
    },
    take: 50,
  });

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  let sent = 0;

  for (const cart of carts) {
    // Skip carts whose email already completed an order since going stale —
    // they came back on their own.
    const completed = await prisma.order.findFirst({
      where: {
        email: cart.email!,
        status: { notIn: ["PENDING", "CANCELLED"] },
        createdAt: { gte: cart.updatedAt },
      },
    });
    if (completed) {
      await prisma.cart.update({
        where: { id: cart.id },
        data: { recoveredAt: new Date() },
      });
      continue;
    }

    const available = cart.items.filter(
      (i) => i.product.status === "ACTIVE" && i.product.quantity > 0,
    );
    if (available.length === 0) continue;

    const token = randomBytes(24).toString("hex");
    await prisma.cart.update({
      where: { id: cart.id },
      data: { recoveryToken: token, recoveryEmailSentAt: new Date() },
    });

    const tpl = abandonedCartEmail({
      items: available.map((i) => ({
        name: i.product.name,
        quantity: i.quantity,
        price: formatMoney(Number(i.product.price) * i.quantity),
      })),
      resumeUrl: `${site}/cart/resume?token=${token}`,
    });
    await sendEmail({
      to: cart.email!,
      ...tpl,
      template: "abandoned-cart",
      meta: { cartId: cart.id },
    });
    sent++;
  }

  return NextResponse.json({ scanned: carts.length, sent });
}
