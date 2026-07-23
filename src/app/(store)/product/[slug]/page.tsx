import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { addToCart } from "@/lib/cart-actions";
import { sanitizeDescription } from "@/lib/sanitize";
import ProductCard, { formatPrice } from "@/components/ProductCard";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await prisma.product.findUnique({
    where: { slug },
    include: { images: { orderBy: { position: "asc" }, take: 1 } },
  });
  if (!product) return {};
  return {
    title: product.metaTitle ?? product.name,
    description: product.metaDescription ?? undefined,
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: {
      title: product.name,
      description: product.metaDescription ?? undefined,
      images: product.images[0] ? [{ url: product.images[0].url }] : undefined,
    },
  };
}

const CARE_LABELS: Record<string, string> = {
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
  EXPERT: "Expert",
};
const INTENSITY_LABELS: Record<string, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
};

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      images: { orderBy: { position: "asc" } },
      categories: { include: { category: true } },
    },
  });
  if (!product || product.status === "DRAFT") notFound();

  const related = await prisma.product.findMany({
    where: {
      status: "ACTIVE",
      id: { not: product.id },
      images: { some: {} },
      categories: {
        some: { categoryId: { in: product.categories.map((c) => c.categoryId) } },
      },
    },
    include: { images: { orderBy: { position: "asc" }, take: 1 } },
    take: 4,
  });

  const soldOut = product.quantity < 1 || product.status !== "ACTIVE";
  const onSale =
    product.compareAtPrice != null &&
    Number(product.compareAtPrice) > Number(product.price);
  const [mainImage, ...restImages] = product.images;

  const careRows: [string, string | null][] = [
    ["Care Level", product.careLevel ? CARE_LABELS[product.careLevel] : null],
    ["Lighting", product.lighting ? INTENSITY_LABELS[product.lighting] : null],
    ["Flow", product.flow ? INTENSITY_LABELS[product.flow] : null],
    ["Placement", product.placement],
    ["Temperament", product.temperament],
    ["Scientific Name", product.scientificName],
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    sku: product.sku,
    image: product.images.map((i) => i.url),
    description: product.metaDescription ?? undefined,
    brand: { "@type": "Brand", name: "AquaVida365" },
    offers: {
      "@type": "Offer",
      priceCurrency: "USD",
      price: Number(product.price).toFixed(2),
      availability:
        soldOut
          ? "https://schema.org/OutOfStock"
          : "https://schema.org/InStock",
    },
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Breadcrumbs */}
      <nav className="mb-6 text-sm text-slate-400">
        <Link href="/shop" className="hover:text-reef-300">Shop</Link>
        {product.categories[0] && (
          <>
            {" / "}
            <Link
              href={`/shop?category=${product.categories[0].category.slug}`}
              className="hover:text-reef-300"
            >
              {product.categories[0].category.name}
            </Link>
          </>
        )}
        {" / "}
        <span className="text-slate-200">{product.name}</span>
      </nav>

      <div className="grid gap-10 md:grid-cols-2">
        {/* Gallery */}
        <div>
          <div className="relative aspect-square overflow-hidden rounded-2xl border border-abyss-700/60 bg-abyss-800">
            {mainImage ? (
              <Image
                src={mainImage.url}
                alt={mainImage.alt ?? product.name}
                fill
                priority
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-6xl">🪸</div>
            )}
          </div>
          {restImages.length > 0 && (
            <div className="mt-3 grid grid-cols-4 gap-3">
              {restImages.slice(0, 8).map((img) => (
                <div
                  key={img.id}
                  className="relative aspect-square overflow-hidden rounded-lg border border-abyss-700/60 bg-abyss-800"
                >
                  <Image
                    src={img.url}
                    alt={img.alt ?? product.name}
                    fill
                    sizes="12vw"
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div>
          <div className="flex flex-wrap items-center gap-2">
            {product.inventoryMode === "WYSIWYG" && (
              <span className="rounded bg-reef-500 px-2 py-0.5 text-xs font-bold text-abyss-950">
                WYSIWYG — you get this exact specimen
              </span>
            )}
            {product.featured && (
              <span className="rounded bg-coral-500/20 px-2 py-0.5 text-xs font-bold text-coral-300">
                High End
              </span>
            )}
          </div>
          <h1 className="mt-2 text-3xl font-bold">{product.name}</h1>
          {product.scientificName && (
            <p className="mt-1 italic text-slate-400">{product.scientificName}</p>
          )}

          <p className="mt-4 text-3xl font-bold text-reef-300">
            {formatPrice(product.price)}
            {onSale && (
              <span className="ml-3 text-lg text-slate-500 line-through">
                {formatPrice(product.compareAtPrice)}
              </span>
            )}
          </p>
          <p className="mt-1 text-sm text-slate-400">
            SKU {product.sku}
            {!soldOut && product.inventoryMode === "STANDARD" && (
              <> · {product.quantity} in stock</>
            )}
          </p>

          {/* Add to cart */}
          <form action={addToCart} className="mt-6 flex items-center gap-3">
            <input type="hidden" name="productId" value={product.id} />
            {product.inventoryMode === "STANDARD" && !soldOut && (
              <select
                name="quantity"
                defaultValue="1"
                className="rounded-lg border border-abyss-700 bg-abyss-900 px-3 py-3 text-sm"
              >
                {Array.from({ length: Math.min(product.quantity, 10) }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1}
                  </option>
                ))}
              </select>
            )}
            <button
              type="submit"
              disabled={soldOut}
              className="flex-1 rounded-full bg-coral-500 px-8 py-3 font-semibold text-white transition hover:bg-coral-600 disabled:cursor-not-allowed disabled:bg-abyss-700 disabled:text-slate-500"
            >
              {soldOut ? "Sold Out" : "Add to Cart"}
            </button>
          </form>

          {/* Care profile */}
          <div className="mt-8 rounded-xl border border-abyss-700/60 bg-abyss-900 p-5">
            <p className="mb-3 font-semibold text-slate-200">Care Profile</p>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {careRows
                .filter(([, v]) => v)
                .map(([label, value]) => (
                  <div key={label} className="flex justify-between border-b border-abyss-800 py-1">
                    <dt className="text-slate-400">{label}</dt>
                    <dd className="font-medium text-slate-200">{value}</dd>
                  </div>
                ))}
            </dl>
            {product.colors.length > 0 && (
              <p className="mt-3 text-sm text-slate-400">
                Colors: <span className="text-slate-200">{product.colors.join(", ")}</span>
              </p>
            )}
          </div>

          {product.description && (
            <div
              className="prose-reef mt-6 text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ __html: sanitizeDescription(product.description) }}
            />
          )}
        </div>
      </div>

      {/* Related */}
      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-4 text-2xl font-bold">You may also like</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
