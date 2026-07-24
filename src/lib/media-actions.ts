"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { deleteObject } from "@/lib/storage";
import type { Role } from "@/generated/prisma/client";

const MEDIA_ROLES: Role[] = ["OWNER", "ADMIN", "INVENTORY_MANAGER", "MARKETING"];

async function requireMediaStaff() {
  const session = await auth();
  if (!session?.user || !MEDIA_ROLES.includes(session.user.role)) {
    throw new Error("Not authorized to manage media");
  }
  return session;
}

/** Delete many images at once, reclaiming their blobs. */
export async function bulkDeleteImages(formData: FormData) {
  const session = await requireMediaStaff();
  const ids = formData.getAll("ids").map(String).filter(Boolean);
  if (ids.length === 0) redirect("/admin/media");

  const images = await prisma.productImage.findMany({
    where: { id: { in: ids } },
    select: { id: true, url: true, thumbUrl: true, productId: true },
  });

  await prisma.productImage.deleteMany({ where: { id: { in: images.map((i) => i.id) } } });
  for (const img of images) {
    await deleteObject(img.url);
    if (img.thumbUrl) await deleteObject(img.thumbUrl);
  }

  // Re-densify positions for every product we touched, so ordering and the
  // "primary = position 0" rule stay intact.
  for (const productId of new Set(images.map((i) => i.productId))) {
    const remaining = await prisma.productImage.findMany({
      where: { productId },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      select: { id: true },
    });
    await prisma.$transaction(
      remaining.map((r, i) =>
        prisma.productImage.update({ where: { id: r.id }, data: { position: i } }),
      ),
    );
  }

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "media.bulk_delete",
      entity: "ProductImage",
      detail: { count: images.length },
    },
  });

  revalidatePath("/admin/media");
  revalidatePath("/shop");
  redirect(`/admin/media?deleted=${images.length}`);
}

/**
 * Move images to a different product. This is the real "recategorize" —
 * an image's category is defined by the product that owns it, so reassigning
 * the owner is what corrects a miscategorized asset.
 */
export async function bulkReassignImages(formData: FormData) {
  const session = await requireMediaStaff();
  const ids = formData.getAll("ids").map(String).filter(Boolean);
  const targetProductId = String(formData.get("targetProductId") ?? "").trim();
  if (ids.length === 0 || !targetProductId) redirect("/admin/media?error=reassign");

  const target = await prisma.product.findUnique({
    where: { id: targetProductId },
    select: { id: true, slug: true },
  });
  if (!target) redirect("/admin/media?error=notfound");

  const images = await prisma.productImage.findMany({
    where: { id: { in: ids } },
    select: { id: true, productId: true },
  });
  const sourceProductIds = new Set(images.map((i) => i.productId));

  // Append to the end of the target's existing images.
  const maxPos = await prisma.productImage.aggregate({
    where: { productId: target.id },
    _max: { position: true },
  });
  let pos = (maxPos._max.position ?? -1) + 1;
  for (const img of images) {
    await prisma.productImage.update({
      where: { id: img.id },
      data: { productId: target.id, position: pos++ },
    });
  }

  // Re-densify the products the images left.
  for (const productId of sourceProductIds) {
    if (productId === target.id) continue;
    const remaining = await prisma.productImage.findMany({
      where: { productId },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      select: { id: true },
    });
    await prisma.$transaction(
      remaining.map((r, i) =>
        prisma.productImage.update({ where: { id: r.id }, data: { position: i } }),
      ),
    );
  }

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "media.bulk_reassign",
      entity: `Product:${target.id}`,
      detail: { count: images.length, from: [...sourceProductIds] },
    },
  });

  revalidatePath("/admin/media");
  revalidatePath("/shop");
  redirect(`/admin/media?reassigned=${images.length}`);
}
