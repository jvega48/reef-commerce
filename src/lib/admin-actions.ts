"use server";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
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
// Image upload (local /public/uploads for dev; swap for R2 in production)
// ---------------------------------------------------------------------------

async function saveUploadedImages(
  formData: FormData,
  productId: string,
  startPosition: number,
) {
  const files = formData
    .getAll("images")
    .filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return;

  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });

  let pos = startPosition;
  for (const file of files) {
    const isVideo = file.type.startsWith("video/");
    if (!file.type.startsWith("image/") && !isVideo) continue;
    const ext = path.extname(file.name).toLowerCase() || (isVideo ? ".mp4" : ".jpg");
    const filename = `${Date.now()}-${randomBytes(4).toString("hex")}${ext}`;
    await writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));
    await prisma.productImage.create({
      data: {
        productId,
        url: `/uploads/${filename}`,
        position: pos++,
        isVideo,
      },
    });
  }
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

  await saveUploadedImages(formData, product.id, 0);
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
  redirect(`/admin/products/${product.id}/edit?created=1`);
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
  await saveUploadedImages(formData, productId, maxPos + 1);

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
  redirect(`/admin/products/${productId}/edit?saved=1`);
}

export async function deleteProductImage(formData: FormData) {
  await requireEditor();
  const imageId = String(formData.get("imageId") ?? "");
  const image = await prisma.productImage.findUnique({ where: { id: imageId } });
  if (!image) return;
  await prisma.productImage.delete({ where: { id: imageId } });
  revalidatePath(`/admin/products/${image.productId}/edit`);
  revalidatePath("/shop");
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
