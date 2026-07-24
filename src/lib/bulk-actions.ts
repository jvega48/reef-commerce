"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { parseCsv } from "@/lib/csv";
import type { ProductStatus, Role } from "@/generated/prisma/client";

const EDIT_ROLES: Role[] = ["OWNER", "ADMIN", "INVENTORY_MANAGER"];

async function requireEditor() {
  const session = await auth();
  if (!session?.user || !EDIT_ROLES.includes(session.user.role)) {
    throw new Error("Not authorized to manage inventory");
  }
  return session;
}

// ---------------------------------------------------------------------------
// Bulk edit — apply one change to a selected set of products
// ---------------------------------------------------------------------------

export async function bulkEditProducts(formData: FormData) {
  const session = await requireEditor();
  const ids = formData.getAll("ids").map(String).filter(Boolean);
  const op = String(formData.get("op") ?? "");
  if (ids.length === 0 || !op) redirect("/admin/products?bulk=none");

  let data: Record<string, unknown> = {};
  switch (op) {
    case "activate":
      data = { status: "ACTIVE" satisfies ProductStatus };
      break;
    case "draft":
      data = { status: "DRAFT" satisfies ProductStatus };
      break;
    case "archive":
      data = { status: "ARCHIVED" satisfies ProductStatus };
      break;
    case "feature":
      data = { featured: true };
      break;
    case "unfeature":
      data = { featured: false };
      break;
    case "pricePct": {
      // Percentage price change applied per-row (can't express in one query).
      const pct = Number(formData.get("value"));
      if (!Number.isFinite(pct) || pct === 0) redirect("/admin/products?bulk=badvalue");
      const products = await prisma.product.findMany({
        where: { id: { in: ids } },
        select: { id: true, price: true },
      });
      await prisma.$transaction(
        products.map((p) =>
          prisma.product.update({
            where: { id: p.id },
            data: {
              price: Math.max(0, Math.round(Number(p.price) * (1 + pct / 100) * 100) / 100),
            },
          }),
        ),
      );
      await audit(session.user.id, op, ids.length, { pct });
      revalidatePath("/admin/products");
      revalidatePath("/shop");
      redirect("/admin/products?bulk=done");
    }
    default:
      redirect("/admin/products?bulk=badop");
  }

  await prisma.product.updateMany({ where: { id: { in: ids } }, data });
  await audit(session.user.id, op, ids.length);
  revalidatePath("/admin/products");
  revalidatePath("/shop");
  redirect("/admin/products?bulk=done");
}

async function audit(userId: string, op: string, count: number, detail?: object) {
  await prisma.auditLog.create({
    data: {
      userId,
      action: "product.bulk",
      entity: "Product",
      detail: { op, count, ...detail },
    },
  });
}

// ---------------------------------------------------------------------------
// CSV import — update prices / quantities / status by SKU
// ---------------------------------------------------------------------------
// Accepts a CSV with a header row containing "SKU" plus any of:
// Price, Quantity, Status, Compare At, Cost. Only present columns update.
// Rows whose SKU isn't found are reported, never created (safer default).

export async function importProductsCsv(formData: FormData) {
  const session = await requireEditor();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    redirect("/admin/products/import?error=nofile");
  }
  if (file.size > 5 * 1024 * 1024) redirect("/admin/products/import?error=toobig");

  const rows = parseCsv(await file.text());
  if (rows.length < 2) redirect("/admin/products/import?error=empty");

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const col = (name: string) => header.indexOf(name);
  const skuIdx = col("sku");
  if (skuIdx < 0) redirect("/admin/products/import?error=nosku");

  const priceIdx = col("price");
  const qtyIdx = col("quantity");
  const statusIdx = col("status");
  const compareIdx = col("compare at");
  const costIdx = col("cost");
  const validStatus = new Set(["DRAFT", "ACTIVE", "ARCHIVED", "SOLD"]);

  let updated = 0;
  const notFound: string[] = [];

  for (const row of rows.slice(1)) {
    const sku = (row[skuIdx] ?? "").trim();
    if (!sku) continue;
    const product = await prisma.product.findUnique({ where: { sku } });
    if (!product) {
      notFound.push(sku);
      continue;
    }
    const data: Record<string, unknown> = {};
    if (priceIdx >= 0 && row[priceIdx]?.trim()) {
      const v = Number(row[priceIdx]);
      if (Number.isFinite(v) && v >= 0) data.price = Math.round(v * 100) / 100;
    }
    if (qtyIdx >= 0 && row[qtyIdx]?.trim()) {
      const v = Math.round(Number(row[qtyIdx]));
      if (Number.isFinite(v) && v >= 0) data.quantity = v;
    }
    if (compareIdx >= 0 && row[compareIdx]?.trim()) {
      const v = Number(row[compareIdx]);
      if (Number.isFinite(v) && v >= 0) data.compareAtPrice = Math.round(v * 100) / 100;
    }
    if (costIdx >= 0 && row[costIdx]?.trim()) {
      const v = Number(row[costIdx]);
      if (Number.isFinite(v) && v >= 0) data.cost = Math.round(v * 100) / 100;
    }
    if (statusIdx >= 0) {
      const s = (row[statusIdx] ?? "").trim().toUpperCase();
      if (validStatus.has(s)) data.status = s;
    }
    if (Object.keys(data).length > 0) {
      await prisma.product.update({ where: { id: product.id }, data });
      updated++;
    }
  }

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "product.import",
      entity: "Product",
      detail: { updated, notFound: notFound.length },
    },
  });
  revalidatePath("/admin/products");
  revalidatePath("/shop");
  const nf = notFound.length ? `&notFound=${notFound.slice(0, 20).join(",")}` : "";
  redirect(`/admin/products/import?updated=${updated}${nf}`);
}
