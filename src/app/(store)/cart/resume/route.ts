import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { CART_COOKIE } from "@/lib/cart";

// Landing route for abandoned-cart recovery emails: re-attaches the cart to
// this browser and drops the shopper on the cart page.

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  if (/^[a-f0-9]{48}$/.test(token)) {
    const cart = await prisma.cart.findUnique({ where: { recoveryToken: token } });
    if (cart) {
      const jar = await cookies();
      jar.set(CART_COOKIE, cart.id, {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30,
        path: "/",
      });
      await prisma.cart.update({
        where: { id: cart.id },
        data: { recoveredAt: new Date() },
      });
      return NextResponse.redirect(`${site}/cart?resumed=1`);
    }
  }
  return NextResponse.redirect(`${site}/cart`);
}
