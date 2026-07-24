"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createCompGiftCard } from "@/lib/giftcard-actions";
import type { DiscountType, Role } from "@/generated/prisma/client";

const MARKETING_ROLES: Role[] = ["OWNER", "ADMIN", "MARKETING"];

async function requireMarketing() {
  const session = await auth();
  if (!session?.user || !MARKETING_ROLES.includes(session.user.role)) {
    throw new Error("Not authorized for marketing tools");
  }
  return session;
}

const num = (fd: FormData, key: string) => {
  const v = Number(fd.get(key));
  return Number.isFinite(v) && v >= 0 ? v : null;
};
const str = (fd: FormData, key: string) => {
  const v = String(fd.get(key) ?? "").trim();
  return v || null;
};

// ---------------------------------------------------------------------------
// Coupons
// ---------------------------------------------------------------------------

export async function createCoupon(formData: FormData) {
  const session = await requireMarketing();
  const code = String(formData.get("code") ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "")
    .slice(0, 40);
  const type = (["PERCENT", "FIXED", "FREE_SHIPPING"] as DiscountType[]).find(
    (t) => t === String(formData.get("type")),
  );
  const value = num(formData, "value") ?? 0;
  if (!code || !type) redirect("/admin/coupons?error=invalid");
  if (type === "PERCENT" && (value <= 0 || value > 100)) {
    redirect("/admin/coupons?error=invalid");
  }
  if (type === "FIXED" && value <= 0) redirect("/admin/coupons?error=invalid");

  const existing = await prisma.coupon.findUnique({ where: { code } });
  if (existing) redirect("/admin/coupons?error=exists");

  const startsAt = str(formData, "startsAt");
  const expiresAt = str(formData, "expiresAt");
  await prisma.coupon.create({
    data: {
      code,
      type,
      value,
      minSubtotal: num(formData, "minSubtotal"),
      maxUses: num(formData, "maxUses"),
      startsAt: startsAt ? new Date(startsAt) : null,
      expiresAt: expiresAt ? new Date(`${expiresAt}T23:59:59`) : null,
      active: true,
    },
  });
  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "coupon.create",
      entity: `Coupon:${code}`,
      detail: { type, value },
    },
  });
  revalidatePath("/admin/coupons");
  redirect("/admin/coupons");
}

export async function toggleCoupon(formData: FormData) {
  await requireMarketing();
  const id = String(formData.get("couponId") ?? "");
  const coupon = await prisma.coupon.findUnique({ where: { id } });
  if (!coupon) return;
  await prisma.coupon.update({ where: { id }, data: { active: !coupon.active } });
  revalidatePath("/admin/coupons");
}

export async function deleteCoupon(formData: FormData) {
  const session = await requireMarketing();
  const id = String(formData.get("couponId") ?? "");
  const coupon = await prisma.coupon.findUnique({
    where: { id },
    include: { orders: { select: { id: true }, take: 1 } },
  });
  if (!coupon) return;
  if (coupon.orders.length > 0) {
    // Used on orders — deactivate instead of destroying history.
    await prisma.coupon.update({ where: { id }, data: { active: false } });
  } else {
    await prisma.coupon.delete({ where: { id } });
  }
  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "coupon.delete",
      entity: `Coupon:${coupon.code}`,
    },
  });
  revalidatePath("/admin/coupons");
}

// ---------------------------------------------------------------------------
// Gift cards (staff)
// ---------------------------------------------------------------------------

export async function issueCompGiftCard(formData: FormData) {
  const session = await requireMarketing();
  const amount = num(formData, "amount") ?? 0;
  if (amount <= 0 || amount > 1000) redirect("/admin/gift-cards?error=amount");
  await createCompGiftCard(amount, str(formData, "note"), session.user.id);
  revalidatePath("/admin/gift-cards");
  redirect("/admin/gift-cards");
}

export async function toggleGiftCard(formData: FormData) {
  const session = await requireMarketing();
  const id = String(formData.get("giftCardId") ?? "");
  const card = await prisma.giftCard.findUnique({ where: { id } });
  if (!card) return;
  await prisma.giftCard.update({ where: { id }, data: { active: !card.active } });
  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: card.active ? "giftcard.deactivate" : "giftcard.activate",
      entity: `GiftCard:${card.id}`,
    },
  });
  revalidatePath("/admin/gift-cards");
}
