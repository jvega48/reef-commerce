import Link from "next/link";
import { prisma } from "@/lib/prisma";
import ProductCard from "@/components/ProductCard";

const CATEGORY_TILES = [
  { label: "LPS Corals", href: "/shop?category=lps", emoji: "🪸" },
  { label: "Soft Corals", href: "/shop?category=soft-corals-2026", emoji: "🌿" },
  { label: "Saltwater Fish", href: "/shop?type=FISH", emoji: "🐠" },
  { label: "Anemones", href: "/shop?category=anemone", emoji: "🌺" },
  { label: "Clean Up Crew", href: "/shop?type=INVERTEBRATE", emoji: "🦐" },
  { label: "WYSIWYG", href: "/shop?category=wysiwyg", emoji: "📸" },
];

export default async function HomePage() {
  const [featured, newArrivals] = await Promise.all([
    prisma.product.findMany({
      where: { status: "ACTIVE", featured: true, images: { some: {} } },
      include: { images: { orderBy: { position: "asc" }, take: 1 } },
      orderBy: { updatedAt: "desc" },
      take: 8,
    }),
    prisma.product.findMany({
      where: { status: "ACTIVE", images: { some: {} } },
      include: { images: { orderBy: { position: "asc" }, take: 1 } },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-abyss-800 via-abyss-900 to-abyss-950">
        <div className="mx-auto max-w-7xl px-4 py-20 text-center md:py-28">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.3em] text-reef-400">
            Premium Reef Livestock
          </p>
          <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight md:text-6xl">
            Bring the reef <span className="text-reef-400">home</span>.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-slate-300">
            Hand-picked corals, rare saltwater fish, and reef-safe inverts —
            photographed in our tanks and shipped overnight to your door.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link
              href="/shop?type=CORAL"
              className="rounded-full bg-coral-500 px-6 py-3 font-semibold text-white transition hover:bg-coral-600"
            >
              Shop Corals
            </Link>
            <Link
              href="/shop"
              className="rounded-full border border-reef-500 px-6 py-3 font-semibold text-reef-300 transition hover:bg-abyss-800"
            >
              Shop All
            </Link>
          </div>
        </div>
      </section>

      {/* Category tiles */}
      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-6">
          {CATEGORY_TILES.map((c) => (
            <Link
              key={c.label}
              href={c.href}
              className="rounded-xl border border-abyss-700/60 bg-abyss-900 p-4 text-center transition hover:border-reef-500/60 hover:bg-abyss-800"
            >
              <div className="text-3xl">{c.emoji}</div>
              <p className="mt-2 text-sm font-medium text-slate-200">{c.label}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured */}
      {featured.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-8">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-2xl font-bold">High-End &amp; Rare</h2>
            <Link href="/shop" className="text-sm text-reef-400 hover:text-reef-300">
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* New arrivals */}
      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-2xl font-bold">New Arrivals</h2>
          <Link href="/shop" className="text-sm text-reef-400 hover:text-reef-300">
            View all →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {newArrivals.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* Value props */}
      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["🚚", "Overnight Shipping", "Livestock ships overnight in insulated boxes with heat/cold packs."],
            ["✅", "Live Arrival Guarantee", "Every fish, coral, and invert is guaranteed to arrive alive."],
            ["💎", "Reef Points Rewards", "Earn points on every order and redeem them at checkout."],
          ].map(([emoji, title, body]) => (
            <div key={title} className="rounded-xl border border-abyss-700/60 bg-abyss-900 p-6">
              <div className="text-2xl">{emoji}</div>
              <p className="mt-2 font-semibold text-slate-100">{title}</p>
              <p className="mt-1 text-sm text-slate-400">{body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
