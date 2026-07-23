"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "./prisma";
import { CART_COOKIE } from "./cart";

async function getOrCreateCartId(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(CART_COOKIE)?.value;
  if (existing) {
    const cart = await prisma.cart.findUnique({ where: { id: existing } });
    if (cart) return cart.id;
  }
  const cart = await prisma.cart.create({ data: {} });
  jar.set(CART_COOKIE, cart.id, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  return cart.id;
}

export async function addToCart(formData: FormData) {
  const productId = String(formData.get("productId") ?? "");
  const quantity = Math.max(1, Number(formData.get("quantity") ?? 1));
  if (!productId) return;

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || product.status !== "ACTIVE" || product.quantity < 1) return;

  const cartId = await getOrCreateCartId();
  const existing = await prisma.cartItem.findUnique({
    where: { cartId_productId: { cartId, productId } },
  });

  // WYSIWYG listings are one-of-a-kind specimens: never more than 1 per cart.
  const maxQty = product.inventoryMode === "WYSIWYG" ? 1 : product.quantity;
  const newQty = Math.min((existing?.quantity ?? 0) + quantity, maxQty);

  if (existing) {
    await prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: newQty } });
  } else {
    await prisma.cartItem.create({ data: { cartId, productId, quantity: newQty } });
  }
  revalidatePath("/cart");
  revalidatePath("/", "layout");
}

export async function updateCartItem(formData: FormData) {
  const itemId = String(formData.get("itemId") ?? "");
  const quantity = Number(formData.get("quantity") ?? 1);
  if (!itemId) return;

  if (quantity < 1) {
    await prisma.cartItem.delete({ where: { id: itemId } }).catch(() => {});
  } else {
    const item = await prisma.cartItem.findUnique({
      where: { id: itemId },
      include: { product: true },
    });
    if (!item) return;
    const maxQty =
      item.product.inventoryMode === "WYSIWYG" ? 1 : item.product.quantity;
    await prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity: Math.min(quantity, maxQty) },
    });
  }
  revalidatePath("/cart");
  revalidatePath("/", "layout");
}

export async function removeCartItem(formData: FormData) {
  const itemId = String(formData.get("itemId") ?? "");
  if (!itemId) return;
  await prisma.cartItem.delete({ where: { id: itemId } }).catch(() => {});
  revalidatePath("/cart");
  revalidatePath("/", "layout");
}
