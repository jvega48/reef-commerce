import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/components/ProductCard";

export const metadata = { title: "Lagoon Theme Preview" };

// Self-contained light-theme preview of the homepage so the two directions
// can be compared side by side. If this direction wins, the whole app's
// palette is refactored to match; if not, this route is deleted.

function LightCard({
  product,
}: {
  product: {
    slug: string;
    name: string;
    price: unknown;
    compareAtPrice: unknown | null;
    quantity: number;
    inventoryMode: string;
    images: { url: string; alt: string | null }[];
  };
}) {
  const img = product.images[0];
  const onSale =
    product.compareAtPrice != null && Number(product.compareAtPrice) > Number(product.price);
  return (
    <Link
      href={`/product/${product.slug}`}
      className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-cyan-600/10"
    >
      <div className="relative aspect-square overflow-hidden bg-slate-100">
        {img && (
          <Image
            src={img.url}
            alt={img.alt ?? product.name}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover transition duration-500 group-hover:scale-110"
          />
        )}
        {product.inventoryMode === "WYSIWYG" && (
          <span className="absolute left-2.5 top-2.5 rounded-full bg-cyan-600 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
            WYSIWYG
          </span>
        )}
        {onSale && (
          <span className="absolute right-2.5 top-2.5 rounded-full bg-orange-500 px-2.5 py-0.5 text-[11px] font-bold uppercase text-white">
            Sale
          </span>
        )}
      </div>
      <div className="p-3.5">
        <p className="truncate text-sm font-medium text-slate-800 group-hover:text-cyan-700">
          {product.name}
        </p>
        <p className="mt-1 flex items-baseline gap-2">
          <span className="font-[family-name:var(--font-display)] font-bold text-cyan-700">
            {formatPrice(product.price)}
          </span>
          {onSale && (
            <span className="text-xs text-slate-400 line-through">
              {formatPrice(product.compareAtPrice)}
            </span>
          )}
        </p>
      </div>
    </Link>
  );
}

export default async function LagoonPreviewPage() {
  const [featured, newArrivals] = await Promise.all([
    prisma.product.findMany({
      where: { status: "ACTIVE", featured: true, images: { some: {} } },
      include: { images: { orderBy: { position: "asc" }, take: 1 } },
      orderBy: { updatedAt: "desc" },
      take: 4,
    }),
    prisma.product.findMany({
      where: { status: "ACTIVE", images: { some: {} } },
      include: { images: { orderBy: { position: "asc" }, take: 1 } },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  return (
    <div className="min-h-screen bg-[#faf8f4] text-slate-800">
      {/* Preview banner */}
      <div className="bg-slate-900 py-2 text-center text-xs font-semibold text-white">
        🎨 Light &quot;Lagoon&quot; theme preview — compare with the{" "}
        <Link href="/" className="underline text-cyan-300">dark ocean theme</Link>.
        Tell Claude which one wins.
      </div>

      {/* Announcement */}
      <div className="bg-gradient-to-r from-cyan-500 to-orange-400 py-1.5 text-center text-xs font-semibold text-white">
        Overnight shipping · 100% live-arrival guarantee · Earn Reef Points on every order
      </div>

      {/* Header */}
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-8 px-4 py-3.5">
          <span className="font-[family-name:var(--font-display)] text-2xl font-extrabold">
            <span className="text-cyan-600">Aqua</span>
            <span className="text-orange-500">Vida</span>
            <span className="align-super text-xs font-bold text-slate-400">365</span>
          </span>
          <nav className="hidden gap-1 text-sm font-medium text-slate-600 md:flex">
            {["Corals", "Fish", "Inverts", "WYSIWYG", "Shop All"].map((l) => (
              <span key={l} className="cursor-pointer rounded-full px-3.5 py-1.5 hover:bg-cyan-50 hover:text-cyan-700">
                {l}
              </span>
            ))}
          </nav>
          <span className="ml-auto rounded-full bg-cyan-600 px-5 py-2 text-sm font-semibold text-white">
            Cart
          </span>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-cyan-50 via-[#fdfbf7] to-[#faf8f4]">
        <div className="mx-auto max-w-7xl px-4 py-24 text-center">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.35em] text-cyan-600">
            Premium Reef Livestock
          </p>
          <h1 className="mx-auto max-w-4xl font-[family-name:var(--font-display)] text-5xl font-extrabold leading-[1.05] text-slate-900 md:text-7xl">
            Bring the reef{" "}
            <span className="bg-gradient-to-r from-cyan-500 to-orange-400 bg-clip-text text-transparent">
              home
            </span>
            .
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-slate-600">
            Hand-picked corals, rare fish, and inverts — photographed in our tanks
            and shipped overnight to your door.
          </p>
          <div className="mt-10 flex justify-center gap-4">
            <span className="cursor-pointer rounded-full bg-orange-500 px-8 py-3.5 font-semibold text-white shadow-xl shadow-orange-500/25 transition hover:-translate-y-0.5 hover:bg-orange-600">
              Shop Corals
            </span>
            <span className="cursor-pointer rounded-full border-2 border-cyan-600 px-8 py-3.5 font-semibold text-cyan-700 transition hover:-translate-y-0.5 hover:bg-cyan-50">
              Explore Everything
            </span>
          </div>
          <div className="mx-auto mt-14 grid max-w-3xl grid-cols-3 gap-3 text-sm">
            {[
              ["Overnight", "insulated shipping"],
              ["100%", "live-arrival guarantee"],
              ["Reef Points", "on every order"],
            ].map(([big, small]) => (
              <div key={big} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <p className="font-[family-name:var(--font-display)] font-bold text-cyan-700">{big}</p>
                <p className="text-xs text-slate-500">{small}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured */}
      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-orange-500">
              Holy grails &amp; rarities
            </p>
            <h2 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-bold text-slate-900">
              High-End &amp; Rare
            </h2>
          </div>
          <span className="text-sm font-medium text-cyan-700">View all →</span>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-5">
          {featured.map((p) => (
            <LightCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* New arrivals */}
      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-600">
              Fresh from the reef
            </p>
            <h2 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-bold text-slate-900">
              New Arrivals
            </h2>
          </div>
          <span className="text-sm font-medium text-cyan-700">View all →</span>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-5">
          {newArrivals.map((p) => (
            <LightCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      <footer className="mt-10 border-t border-slate-200 bg-white py-8 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} AquaVida365 — light &quot;Lagoon&quot; theme preview ·{" "}
        <Link href="/" className="text-cyan-700 underline">back to dark theme</Link>
      </footer>
    </div>
  );
}
