import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import ProductCard from "@/components/ProductCard";

const CATEGORY_TILES: {
  label: string;
  href: string;
  where: Prisma.ProductWhereInput;
}[] = [
  {
    label: "LPS Corals",
    href: "/shop?category=lps",
    where: { categories: { some: { category: { slug: "lps" } } } },
  },
  {
    label: "Soft Corals",
    href: "/shop?category=soft-corals-2026",
    where: { categories: { some: { category: { slug: "soft-corals-2026" } } } },
  },
  {
    label: "Saltwater Fish",
    href: "/shop?type=FISH",
    where: { livestockType: "FISH" },
  },
  {
    label: "Anemones",
    href: "/shop?category=anemone",
    where: { categories: { some: { category: { slug: "anemone" } } } },
  },
  {
    label: "Clean Up Crew",
    href: "/shop?type=INVERTEBRATE",
    where: { livestockType: "INVERTEBRATE" },
  },
  {
    label: "Tangs",
    href: "/shop?category=tangs",
    where: { categories: { some: { category: { slug: "tangs" } } } },
  },
];

export default async function HomePage() {
  const [featured, newArrivals, heroImage, productCount, tileImages] =
    await Promise.all([
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
      prisma.productImage.findFirst({
        where: {
          position: { lte: 1 },
          product: { status: "ACTIVE", featured: true, livestockType: "CORAL" },
        },
        orderBy: { product: { updatedAt: "desc" } },
      }),
      prisma.product.count({ where: { status: "ACTIVE" } }),
      Promise.all(
        CATEGORY_TILES.map((tile) =>
          prisma.productImage.findFirst({
            where: { position: { lte: 1 }, product: { status: "ACTIVE", ...tile.where } },
            orderBy: { product: { featured: "desc" } },
          }),
        ),
      ),
    ]);

  return (
    <div>
      {/* ================= Hero ================= */}
      <section className="relative overflow-hidden">
        {heroImage && (
          <Image
            src={heroImage.url}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-30"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-abyss-950/70 via-abyss-950/50 to-abyss-950" />
        <div className="glow-reef pointer-events-none absolute -left-40 top-10 h-96 w-96 rounded-full" />
        <div className="glow-coral pointer-events-none absolute -right-32 bottom-0 h-80 w-80 rounded-full" />

        <div className="relative mx-auto max-w-7xl px-4 py-28 text-center md:py-40">
          <p className="animate-fade-up mb-4 text-xs font-bold uppercase tracking-[0.35em] text-reef-400">
            Premium Reef Livestock · Est. 365 days a year
          </p>
          <h1 className="animate-fade-up anim-d1 mx-auto max-w-4xl text-5xl font-extrabold leading-[1.05] md:text-7xl">
            Bring the reef <span className="text-gradient">home</span>.
          </h1>
          <p className="animate-fade-up anim-d2 mx-auto mt-6 max-w-xl text-lg text-slate-300">
            {productCount}+ hand-picked corals, rare fish, and inverts —
            photographed in our tanks and shipped overnight to your door.
          </p>
          <div className="animate-fade-up anim-d3 mt-10 flex flex-wrap justify-center gap-4">
            <Link
              href="/shop?type=CORAL"
              className="rounded-full bg-coral-500 px-8 py-3.5 font-semibold text-white shadow-xl shadow-coral-500/25 transition hover:-translate-y-0.5 hover:bg-coral-600 hover:shadow-coral-500/40"
            >
              Shop Corals
            </Link>
            <Link
              href="/shop"
              className="glass rounded-full px-8 py-3.5 font-semibold text-reef-300 transition hover:-translate-y-0.5 hover:text-reef-200"
            >
              Explore Everything
            </Link>
          </div>

          {/* Trust strip */}
          <div className="animate-fade-up anim-d4 mx-auto mt-16 grid max-w-3xl grid-cols-3 gap-3 text-sm">
            {[
              ["Overnight", "insulated shipping"],
              ["100%", "live-arrival guarantee"],
              ["Reef Points", "on every order"],
            ].map(([big, small]) => (
              <div key={big} className="glass rounded-2xl px-4 py-3">
                <p className="font-[family-name:var(--font-display)] font-bold text-reef-300">{big}</p>
                <p className="text-xs text-slate-400">{small}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= Category tiles ================= */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <h2 className="text-2xl font-bold md:text-3xl">
          Shop by <span className="text-gradient">category</span>
        </h2>
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {CATEGORY_TILES.map((tile, i) => {
            const img = tileImages[i];
            return (
              <Link
                key={tile.label}
                href={tile.href}
                className="group relative aspect-[4/5] overflow-hidden rounded-2xl border border-abyss-700/50 bg-abyss-900 transition duration-300 hover:-translate-y-1 hover:border-reef-500/50 hover:shadow-xl hover:shadow-reef-500/10"
              >
                {img && (
                  <Image
                    src={img.url}
                    alt={tile.label}
                    fill
                    sizes="(max-width: 768px) 50vw, 16vw"
                    className="object-cover transition duration-500 group-hover:scale-110"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-abyss-950/95 via-abyss-950/20 to-transparent" />
                <p className="absolute inset-x-0 bottom-0 p-3 text-center text-sm font-semibold text-white">
                  {tile.label}
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ================= Featured ================= */}
      {featured.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-10">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-coral-400">
                Holy grails &amp; rarities
              </p>
              <h2 className="mt-1 text-2xl font-bold md:text-3xl">High-End &amp; Rare</h2>
            </div>
            <Link href="/shop" className="text-sm font-medium text-reef-400 hover:text-reef-300">
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-5">
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* ================= New arrivals ================= */}
      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-reef-400">
              Fresh from the reef
            </p>
            <h2 className="mt-1 text-2xl font-bold md:text-3xl">New Arrivals</h2>
          </div>
          <Link href="/shop" className="text-sm font-medium text-reef-400 hover:text-reef-300">
            View all →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-5">
          {newArrivals.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* ================= Big CTA ================= */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="relative overflow-hidden rounded-3xl border border-reef-500/20 bg-gradient-to-br from-abyss-800 via-abyss-900 to-abyss-950 px-6 py-14 text-center md:py-20">
          <div className="glow-reef pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full" />
          <div className="glow-coral pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full" />
          <h2 className="relative text-3xl font-extrabold md:text-4xl">
            What you see is what you <span className="text-gradient">get</span>.
          </h2>
          <p className="relative mx-auto mt-4 max-w-lg text-slate-300">
            Our WYSIWYG listings are photographed one specimen at a time — the exact
            coral in the photo is the one that arrives at your door.
          </p>
          <Link
            href="/shop?category=wysiwyg"
            className="relative mt-8 inline-block rounded-full bg-reef-500 px-8 py-3.5 font-semibold text-abyss-950 shadow-xl shadow-reef-500/25 transition hover:-translate-y-0.5 hover:bg-reef-400"
          >
            Browse WYSIWYG
          </Link>
        </div>
      </section>
    </div>
  );
}
