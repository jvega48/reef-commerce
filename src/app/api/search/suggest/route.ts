import { NextRequest, NextResponse } from "next/server";
import { suggestProducts } from "@/lib/search";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const products = await suggestProducts(q);
  return NextResponse.json(
    {
      results: products.map((p) => ({
        name: p.name,
        slug: p.slug,
        price: Number(p.price),
        soldOut: p.quantity < 1,
        image: p.images[0]?.url ?? null,
      })),
    },
    { headers: { "Cache-Control": "public, max-age=30" } },
  );
}
