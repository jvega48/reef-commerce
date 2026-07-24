"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { restockEmail } from "@/lib/email-templates";
import {
  ImageRejected,
  attachUploadedMedia,
  processAndStoreImage,
} from "@/lib/image-processing";
import { deleteObject } from "@/lib/storage";
import type {
  CareLevel,
  Intensity,
  InventoryMode,
  LivestockType,
  ProductStatus,
  Role,
} from "@/generated/prisma/client";

const EDIT_ROLES: Role[] = ["OWNER", "ADMIN", "INVENTORY_MANAGER"];

async function requireEditor() {
  const session = await auth();
  if (!session?.user || !EDIT_ROLES.includes(session.user.role)) {
    throw new Error("Not authorized to manage inventory");
  }
  return session;
}

// ---------------------------------------------------------------------------
// Field parsing helpers
// ---------------------------------------------------------------------------

const str = (fd: FormData, key: string) => {
  const v = String(fd.get(key) ?? "").trim();
  return v || null;
};
const num = (fd: FormData, key: string, fallback = 0) => {
  const v = Number(fd.get(key));
  return Number.isFinite(v) ? v : fallback;
};
const oneOf = <T extends string>(fd: FormData, key: string, allowed: readonly T[]): T | null => {
  const v = String(fd.get(key) ?? "");
  return (allowed as readonly string[]).includes(v) ? (v as T) : null;
};
const list = (fd: FormData, key: string) =>
  String(fd.get(key) ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "product";
}

async function uniqueSlug(base: string, excludeId?: string): Promise<string> {
  let slug = base;
  for (let i = 2; ; i++) {
    const existing = await prisma.product.findUnique({ where: { slug } });
    if (!existing || existing.id === excludeId) return slug;
    slug = `${base}-${i}`;
  }
}

async function nextSku(): Promise<string> {
  const count = await prisma.product.count();
  for (let i = count + 1; ; i++) {
    const sku = `AV-${String(i).padStart(5, "0")}`;
    if (!(await prisma.product.findUnique({ where: { sku } }))) return sku;
  }
}

// ---------------------------------------------------------------------------
// Image upload — validated, optimized, and stored via the storage abstraction
// (Cloudflare R2 in production, public/uploads locally). See
// src/lib/image-processing.ts and src/lib/storage.ts.
// ---------------------------------------------------------------------------

/** Pull the uploaded files off the form and attach them to the product. */
async function saveUploadedImages(
  formData: FormData,
  productId: string,
  startPosition: number,
): Promise<string[]> {
  const files = formData
    .getAll("images")
    .filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return [];
  return attachUploadedMedia(files, productId, startPosition);
}

// ---------------------------------------------------------------------------
// Shared field extraction for create/update
// ---------------------------------------------------------------------------

function productFields(fd: FormData) {
  return {
    name: String(fd.get("name") ?? "").trim(),
    scientificName: str(fd, "scientificName"),
    description: str(fd, "description"),
    status: oneOf<ProductStatus>(fd, "status", ["DRAFT", "ACTIVE", "ARCHIVED", "SOLD"]) ?? "DRAFT",
    inventoryMode:
      oneOf<InventoryMode>(fd, "inventoryMode", ["STANDARD", "WYSIWYG"]) ?? "STANDARD",
    livestockType:
      oneOf<LivestockType>(fd, "livestockType", ["CORAL", "FISH", "INVERTEBRATE", "DRY_GOOD", "MERCH"]) ?? "CORAL",
    careLevel: oneOf<CareLevel>(fd, "careLevel", ["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"]),
    lighting: oneOf<Intensity>(fd, "lighting", ["LOW", "MEDIUM", "HIGH"]),
    flow: oneOf<Intensity>(fd, "flow", ["LOW", "MEDIUM", "HIGH"]),
    placement: str(fd, "placement"),
    temperament: str(fd, "temperament"),
    specimenSize: str(fd, "specimenSize"),
    growthForm: str(fd, "growthForm"),
    colors: list(fd, "colors"),
    tags: list(fd, "tags"),
    price: num(fd, "price"),
    compareAtPrice: str(fd, "compareAtPrice") ? num(fd, "compareAtPrice") : null,
    cost: str(fd, "cost") ? num(fd, "cost") : null,
    quantity: Math.max(0, Math.round(num(fd, "quantity"))),
    lowStockThreshold: Math.max(0, Math.round(num(fd, "lowStockThreshold", 2))),
    weightGrams: Math.max(0, Math.round(num(fd, "weightGrams"))),
    vendor: str(fd, "vendor") ?? "Aquavida365",
    featured: fd.get("featured") === "on",
  };
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export async function createProduct(formData: FormData) {
  const session = await requireEditor();
  const fields = productFields(formData);
  if (!fields.name) redirect("/admin/products/new?error=name");

  const slug = await uniqueSlug(slugify(fields.name));
  const sku = str(formData, "sku") ?? (await nextSku());
  // A WYSIWYG listing is a single photographed specimen.
  const quantity = fields.inventoryMode === "WYSIWYG" ? Math.min(fields.quantity || 1, 1) : fields.quantity;

  const product = await prisma.product.create({
    data: {
      ...fields,
      quantity,
      sku,
      slug,
      metaTitle: `${fields.name} | AquaVida365`,
      metaDescription: fields.description?.replace(/<[^>]+>/g, " ").slice(0, 155) ?? null,
      categories: {
        create: formData.getAll("categoryIds").map((id) => ({ categoryId: String(id) })),
      },
    },
  });

  const uploadErrors = await saveUploadedImages(formData, product.id, 0);
  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "product.create",
      entity: `Product:${product.id}`,
      detail: { name: product.name, sku: product.sku },
    },
  });

  revalidatePath("/admin/products");
  revalidatePath("/shop");
  revalidatePath("/");
  const q = uploadErrors.length
    ? `?created=1&uploadError=${encodeURIComponent(uploadErrors.join(" · "))}`
    : "?created=1";
  redirect(`/admin/products/${product.id}/edit${q}`);
}

export async function updateProduct(formData: FormData) {
  const session = await requireEditor();
  const productId = String(formData.get("productId") ?? "");
  const existing = await prisma.product.findUnique({
    where: { id: productId },
    include: { images: true },
  });
  if (!existing) redirect("/admin/products");

  const fields = productFields(formData);
  if (!fields.name) redirect(`/admin/products/${productId}/edit?error=name`);

  const slug =
    slugify(fields.name) === existing.slug
      ? existing.slug
      : await uniqueSlug(slugify(fields.name), productId);
  const quantity =
    fields.inventoryMode === "WYSIWYG" ? Math.min(fields.quantity || 1, 1) : fields.quantity;

  await prisma.product.update({
    where: { id: productId },
    data: {
      ...fields,
      quantity,
      slug,
      categories: {
        deleteMany: {},
        create: formData.getAll("categoryIds").map((id) => ({ categoryId: String(id) })),
      },
    },
  });

  const maxPos = existing.images.reduce((m, i) => Math.max(m, i.position), -1);
  const uploadErrors = await saveUploadedImages(formData, productId, maxPos + 1);

  // Back in stock? Notify everyone on the alert list (once per restock).
  const cameBackInStock =
    existing.quantity < 1 &&
    quantity > 0 &&
    fields.status === "ACTIVE";
  if (cameBackInStock) {
    const alerts = await prisma.stockAlert.findMany({
      where: { productId, notified: false },
      include: { user: { select: { email: true, notifyRestock: true } } },
    });
    for (const alert of alerts) {
      if (alert.user.notifyRestock) {
        const tpl = restockEmail({ name: fields.name, slug });
        await sendEmail({
          to: alert.user.email,
          ...tpl,
          template: "restock",
          meta: { productId },
        });
      }
      await prisma.stockAlert.update({
        where: { id: alert.id },
        data: { notified: true },
      });
    }
  }

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "product.update",
      entity: `Product:${productId}`,
      detail: { name: fields.name },
    },
  });

  revalidatePath("/admin/products");
  revalidatePath(`/product/${slug}`);
  revalidatePath("/shop");
  revalidatePath("/");
  const q = uploadErrors.length
    ? `?saved=1&uploadError=${encodeURIComponent(uploadErrors.join(" · "))}`
    : "?saved=1";
  redirect(`/admin/products/${productId}/edit${q}`);
}

// ---------------------------------------------------------------------------
// Image management: delete, reorder, set primary, alt text, replace
//
// "Primary image" is simply position 0 — every storefront read takes the
// lowest position, so promoting an image means renumbering. Positions are
// always rewritten as a dense 0-based sequence to keep ordering unambiguous.
// ---------------------------------------------------------------------------

/** Rewrite a product's image positions to a dense 0..n-1 sequence. */
async function normalizePositions(productId: string) {
  const images = await prisma.productImage.findMany({
    where: { productId },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });
  await prisma.$transaction(
    images.map((img, i) =>
      prisma.productImage.update({ where: { id: img.id }, data: { position: i } }),
    ),
  );
}

async function revalidateProductImages(productId: string) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { slug: true },
  });
  revalidatePath(`/admin/products/${productId}/edit`);
  revalidatePath("/admin/media");
  if (product) revalidatePath(`/product/${product.slug}`);
  revalidatePath("/shop");
  revalidatePath("/");
}

export async function deleteProductImage(formData: FormData) {
  await requireEditor();
  const imageId = String(formData.get("imageId") ?? "");
  const image = await prisma.productImage.findUnique({ where: { id: imageId } });
  if (!image) return;

  await prisma.productImage.delete({ where: { id: imageId } });
  // Reclaim the blob too, so deletes don't leak storage. Shopify CDN URLs are
  // left untouched (we don't own them).
  await deleteObject(image.url);
  if (image.thumbUrl) await deleteObject(image.thumbUrl);

  await normalizePositions(image.productId);
  await revalidateProductImages(image.productId);
}

/** Move an image one slot earlier/later, or straight to the front (primary). */
export async function moveProductImage(formData: FormData) {
  await requireEditor();
  const imageId = String(formData.get("imageId") ?? "");
  const direction = String(formData.get("direction") ?? "");
  const image = await prisma.productImage.findUnique({ where: { id: imageId } });
  if (!image) return;

  const siblings = await prisma.productImage.findMany({
    where: { productId: image.productId },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });
  const from = siblings.findIndex((s) => s.id === imageId);
  if (from === -1) return;

  let to = from;
  if (direction === "up") to = Math.max(0, from - 1);
  else if (direction === "down") to = Math.min(siblings.length - 1, from + 1);
  else if (direction === "primary") to = 0;
  if (to === from) return;

  const reordered = [...siblings];
  const [moved] = reordered.splice(from, 1);
  reordered.splice(to, 0, moved);

  await prisma.$transaction(
    reordered.map((s, i) =>
      prisma.productImage.update({ where: { id: s.id }, data: { position: i } }),
    ),
  );
  await revalidateProductImages(image.productId);
}

/** Persist a new drag-and-drop order (array of image ids, front to back). */
export async function reorderProductImages(formData: FormData) {
  await requireEditor();
  const productId = String(formData.get("productId") ?? "");
  let ids: string[] = [];
  try {
    ids = JSON.parse(String(formData.get("order") ?? "[]"));
  } catch {
    return;
  }
  if (!productId || !Array.isArray(ids) || ids.length === 0) return;

  // Only accept ids that actually belong to this product — never trust the
  // client to tell us which rows to renumber.
  const owned = await prisma.productImage.findMany({
    where: { productId },
    select: { id: true },
  });
  const ownedIds = new Set(owned.map((o) => o.id));
  const clean = ids.filter((id) => ownedIds.has(id));
  // Anything the client omitted keeps its relative order at the end.
  for (const o of owned) if (!clean.includes(o.id)) clean.push(o.id);

  await prisma.$transaction(
    clean.map((id, i) =>
      prisma.productImage.update({ where: { id }, data: { position: i } }),
    ),
  );
  await revalidateProductImages(productId);
}

export async function updateImageAlt(formData: FormData) {
  await requireEditor();
  const imageId = String(formData.get("imageId") ?? "");
  const alt = String(formData.get("alt") ?? "").trim().slice(0, 200) || null;
  const image = await prisma.productImage.findUnique({ where: { id: imageId } });
  if (!image) return;
  await prisma.productImage.update({ where: { id: imageId }, data: { alt } });
  await revalidateProductImages(image.productId);
}

/** Swap the file behind an existing image row, keeping its position and alt. */
export async function replaceProductImage(formData: FormData) {
  await requireEditor();
  const imageId = String(formData.get("imageId") ?? "");
  const file = formData.get("file");
  const image = await prisma.productImage.findUnique({ where: { id: imageId } });
  if (!image) return;
  if (!(file instanceof File) || file.size === 0) return;

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const processed = await processAndStoreImage(buffer, file.name);
    const oldUrl = image.url;
    const oldThumb = image.thumbUrl;
    await prisma.productImage.update({
      where: { id: imageId },
      data: {
        url: processed.url,
        thumbUrl: processed.thumbUrl,
        width: processed.width,
        height: processed.height,
        bytes: processed.bytes,
        isVideo: false,
      },
    });
    await deleteObject(oldUrl);
    if (oldThumb) await deleteObject(oldThumb);
  } catch (e) {
    const msg = e instanceof ImageRejected ? e.message : "Replacement failed.";
    redirect(
      `/admin/products/${image.productId}/edit?uploadError=${encodeURIComponent(msg)}`,
    );
  }
  await revalidateProductImages(image.productId);
  redirect(`/admin/products/${image.productId}/edit?saved=1`);
}

export async function deleteProduct(formData: FormData) {
  const session = await requireEditor();
  const productId = String(formData.get("productId") ?? "");
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) redirect("/admin/products");

  await prisma.product.delete({ where: { id: productId } });
  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "product.delete",
      entity: `Product:${productId}`,
      detail: { name: product.name, sku: product.sku },
    },
  });

  revalidatePath("/admin/products");
  revalidatePath("/shop");
  redirect("/admin/products");
}
