import { NextResponse } from "next/server";
import { auth, STAFF_ROLES } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user || !STAFF_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  const products = await prisma.product.findMany({
    where: {
      status: "ACTIVE",
      quantity: { gt: 0 },
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { sku: { contains: q, mode: "insensitive" } },
              { scientificName: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: { images: { orderBy: { position: "asc" }, take: 1 } },
    orderBy: { updatedAt: "desc" },
    take: 20,
  });

  return NextResponse.json(
    products.map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      price: Number(p.price),
      quantity: p.quantity,
      inventoryMode: p.inventoryMode,
      image: p.images[0]?.url ?? null,
    })),
  );
}
