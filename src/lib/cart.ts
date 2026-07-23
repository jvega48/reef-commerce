import { cookies } from "next/headers";
import { prisma } from "./prisma";

export const CART_COOKIE = "av_cart_id";

export async function getCart() {
  const jar = await cookies();
  const cartId = jar.get(CART_COOKIE)?.value;
  if (!cartId) return null;

  return prisma.cart.findUnique({
    where: { id: cartId },
    include: {
      items: {
        include: {
          product: { include: { images: { orderBy: { position: "asc" }, take: 1 } } },
        },
        orderBy: { id: "asc" },
      },
    },
  });
}

export async function getCartItemCount(): Promise<number> {
  const cart = await getCart();
  if (!cart) return 0;
  return cart.items.reduce((sum, i) => sum + i.quantity, 0);
}
