"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/generated/prisma/client";

const REVIEW_POINTS = 50;

// ---------------------------------------------------------------------------
// Customer: submit / update a review (one per product per customer).
// Reviews go live after staff approval; approval awards Reef Points once.
// ---------------------------------------------------------------------------

export async function submitReview(formData: FormData) {
  const session = await auth();
  const productId = String(formData.get("productId") ?? "");
  const slug = String(formData.get("slug") ?? "");
  if (!session?.user) redirect(`/login?next=/product/${slug}`);

  const rating = Math.min(5, Math.max(1, Number(formData.get("rating")) || 0));
  const title = String(formData.get("title") ?? "").trim().slice(0, 120) || null;
  const body = String(formData.get("body") ?? "").trim().slice(0, 4000) || null;
  if (!productId || rating < 1) redirect(`/product/${slug}?review=invalid`);

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) redirect("/shop");

  // Verified badge = the reviewer actually bought this product here.
  const purchased = await prisma.orderItem.findFirst({
    where: {
      productId,
      order: {
        userId: session.user.id,
        status: { notIn: ["PENDING", "CANCELLED"] },
      },
    },
  });

  await prisma.review.upsert({
    where: { userId_productId: { userId: session.user.id, productId } },
    // Re-submitting resets approval so edits get re-moderated.
    update: { rating, title, body, approved: false, verified: Boolean(purchased) },
    create: {
      userId: session.user.id,
      productId,
      rating,
      title,
      body,
      verified: Boolean(purchased),
    },
  });

  revalidatePath(`/product/${slug}`);
  redirect(`/product/${slug}?review=thanks`);
}

// ---------------------------------------------------------------------------
// Staff moderation
// ---------------------------------------------------------------------------

const MOD_ROLES: Role[] = ["OWNER", "ADMIN", "MARKETING", "SUPPORT"];

async function requireModerator() {
  const session = await auth();
  if (!session?.user || !MOD_ROLES.includes(session.user.role)) {
    throw new Error("Not authorized to moderate reviews");
  }
  return session;
}

/** Recompute the product's denormalized rating stats from approved reviews. */
async function refreshProductRating(productId: string) {
  const agg = await prisma.review.aggregate({
    where: { productId, approved: true },
    _avg: { rating: true },
    _count: true,
  });
  await prisma.product.update({
    where: { id: productId },
    data: {
      ratingAvg: agg._avg.rating ?? 0,
      ratingCount: agg._count,
    },
  });
}

export async function approveReview(formData: FormData) {
  const session = await requireModerator();
  const id = String(formData.get("reviewId") ?? "");
  const review = await prisma.review.findUnique({
    where: { id },
    include: { product: { select: { slug: true, name: true } } },
  });
  if (!review || review.approved) return;

  await prisma.review.update({ where: { id }, data: { approved: true } });
  await refreshProductRating(review.productId);

  // Points are a one-time reward per review (guard against re-approval after edits).
  const alreadyRewarded = await prisma.pointsTransaction.findFirst({
    where: { userId: review.userId, reason: "REVIEW", note: review.id },
  });
  if (!alreadyRewarded) {
    await prisma.$transaction([
      prisma.pointsTransaction.create({
        data: {
          userId: review.userId,
          points: REVIEW_POINTS,
          reason: "REVIEW",
          note: review.id,
        },
      }),
      prisma.user.update({
        where: { id: review.userId },
        data: { reefPoints: { increment: REVIEW_POINTS } },
      }),
    ]);
  }

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "review.approve",
      entity: `Review:${id}`,
    },
  });
  revalidatePath("/admin/reviews");
  revalidatePath(`/product/${review.product.slug}`);
}

export async function deleteReview(formData: FormData) {
  const session = await requireModerator();
  const id = String(formData.get("reviewId") ?? "");
  const review = await prisma.review.findUnique({
    where: { id },
    include: { product: { select: { slug: true } } },
  });
  if (!review) return;

  await prisma.review.delete({ where: { id } });
  await refreshProductRating(review.productId);
  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "review.delete",
      entity: `Review:${id}`,
    },
  });
  revalidatePath("/admin/reviews");
  revalidatePath(`/product/${review.product.slug}`);
}

export async function replyToReview(formData: FormData) {
  await requireModerator();
  const id = String(formData.get("reviewId") ?? "");
  const reply = String(formData.get("reply") ?? "").trim().slice(0, 2000) || null;
  const review = await prisma.review.findUnique({
    where: { id },
    include: { product: { select: { slug: true } } },
  });
  if (!review) return;
  await prisma.review.update({ where: { id }, data: { adminReply: reply } });
  revalidatePath("/admin/reviews");
  revalidatePath(`/product/${review.product.slug}`);
}

// ---------------------------------------------------------------------------
// Back-in-stock alerts
// ---------------------------------------------------------------------------

export async function requestStockAlert(formData: FormData) {
  const session = await auth();
  const productId = String(formData.get("productId") ?? "");
  const slug = String(formData.get("slug") ?? "");
  if (!session?.user) redirect(`/login?next=/product/${slug}`);
  if (!productId) return;

  await prisma.stockAlert.upsert({
    where: { userId_productId: { userId: session.user.id, productId } },
    update: { notified: false },
    create: { userId: session.user.id, productId },
  });
  redirect(`/product/${slug}?alert=set`);
}
