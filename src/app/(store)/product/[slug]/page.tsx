import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { addToCart } from "@/lib/cart-actions";
import { toggleWishlist } from "@/lib/account-actions";
import { requestStockAlert, submitReview } from "@/lib/review-actions";
import { sanitizeDescription } from "@/lib/sanitize";
import { getRecentlyViewedProducts } from "@/lib/recently-viewed";
import ProductCard, { formatPrice } from "@/components/ProductCard";
import RecordView from "@/components/RecordView";
import Stars from "@/components/Stars";

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
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ review?: string; alert?: string }>;
}) {
  const [{ slug }, { review: reviewFlash, alert: alertFlash }, session] =
    await Promise.all([params, searchParams, auth()]);

  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      images: { orderBy: { position: "asc" } },
      categories: { include: { category: true } },
      reviews: {
        where: { approved: true },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { user: { select: { name: true } } },
      },
    },
  });
  if (!product || product.status === "DRAFT") notFound();

  const [related, alsoBought, recentlyViewed, wishlisted, myReview] =
    await Promise.all([
      prisma.product.findMany({
        where: {
          status: "ACTIVE",
          id: { not: product.id },
          images: { some: {} },
          categories: {
            some: { categoryId: { in: product.categories.map((c) => c.categoryId) } },
          },
        },
        include: { images: { orderBy: { position: "asc" }, take: 1 } },
        orderBy: { soldCount: "desc" },
        take: 4,
      }),
      // Cross-sell: best sellers of a *different* livestock type (pair corals
      // with clean-up crews, fish with corals, …).
      prisma.product.findMany({
        where: {
          status: "ACTIVE",
          quantity: { gt: 0 },
          livestockType: { not: product.livestockType },
          images: { some: {} },
        },
        include: { images: { orderBy: { position: "asc" }, take: 1 } },
        orderBy: { soldCount: "desc" },
        take: 4,
      }),
      getRecentlyViewedProducts(slug, 4),
      session?.user
        ? prisma.wishlistItem.findUnique({
            where: {
              userId_productId: { userId: session.user.id, productId: product.id },
            },
          })
        : null,
      session?.user
        ? prisma.review.findUnique({
            where: {
              userId_productId: { userId: session.user.id, productId: product.id },
            },
          })
        : null,
    ]);

  const soldOut = product.quantity < 1 || product.status !== "ACTIVE";
  const onSale =
    product.compareAtPrice != null &&
    Number(product.compareAtPrice) > Number(product.price);
  const [mainImage, ...restImages] = product.images;
  const ratingAvg = Number(product.ratingAvg);

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
    ...(product.ratingCount > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: ratingAvg.toFixed(1),
            reviewCount: product.ratingCount,
          },
        }
      : {}),
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
      <RecordView slug={product.slug} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Breadcrumbs */}
      <nav className="mb-6 text-sm text-slate-400" aria-label="Breadcrumb">
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
          <div className="mt-2 flex items-start justify-between gap-3">
            <h1 className="text-3xl font-bold">{product.name}</h1>
            <form action={toggleWishlist} className="mt-1 shrink-0">
              <input type="hidden" name="productId" value={product.id} />
              <input type="hidden" name="returnTo" value={`/product/${product.slug}`} />
              <button
                aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
                title={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
                className={`flex h-10 w-10 items-center justify-center rounded-full border text-lg transition ${
                  wishlisted
                    ? "border-coral-500/60 bg-coral-500/15 text-coral-400 hover:bg-coral-500/25"
                    : "border-abyss-700 text-slate-400 hover:border-coral-500/60 hover:text-coral-400"
                }`}
              >
                {wishlisted ? "♥" : "♡"}
              </button>
            </form>
          </div>
          {product.scientificName && (
            <p className="mt-1 italic text-slate-400">{product.scientificName}</p>
          )}
          {product.ratingCount > 0 && (
            <a href="#reviews" className="mt-2 flex items-center gap-2 text-sm text-slate-400 hover:text-reef-300">
              <Stars rating={ratingAvg} />
              {ratingAvg.toFixed(1)} · {product.ratingCount} review{product.ratingCount === 1 ? "" : "s"}
            </a>
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

          {/* Add to cart / stock alert */}
          {soldOut ? (
            <div className="mt-6">
              {alertFlash === "set" ? (
                <p className="rounded-xl border border-reef-500/40 bg-reef-500/10 px-5 py-3 text-sm text-reef-300">
                  🔔 You&apos;re on the list — we&apos;ll email you the moment this is back.
                </p>
              ) : (
                <form action={requestStockAlert} className="flex items-center gap-3">
                  <input type="hidden" name="productId" value={product.id} />
                  <input type="hidden" name="slug" value={product.slug} />
                  <button className="flex-1 rounded-full border border-reef-500/50 px-8 py-3 font-semibold text-reef-300 transition hover:bg-reef-500 hover:text-abyss-950">
                    🔔 Notify me when back in stock
                  </button>
                </form>
              )}
            </div>
          ) : (
            <form action={addToCart} className="mt-6 flex items-center gap-3">
              <input type="hidden" name="productId" value={product.id} />
              {product.inventoryMode === "STANDARD" && (
                <select
                  name="quantity"
                  defaultValue="1"
                  aria-label="Quantity"
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
                className="flex-1 rounded-full bg-coral-500 px-8 py-3 font-semibold text-white transition hover:bg-coral-600"
              >
                Add to Cart
              </button>
            </form>
          )}

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

      {/* Reviews */}
      <section id="reviews" className="mt-16 scroll-mt-24">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-bold">
            Reviews{product.ratingCount > 0 && ` (${product.ratingCount})`}
          </h2>
          {product.ratingCount > 0 && (
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Stars rating={ratingAvg} size="text-base" />
              {ratingAvg.toFixed(1)} average
            </div>
          )}
        </div>

        {reviewFlash === "thanks" && (
          <p className="mt-4 rounded-lg border border-reef-500/40 bg-reef-500/10 px-4 py-2 text-sm text-reef-300" role="status">
            Thanks! Your review is in the moderation queue — you&apos;ll earn 50 Reef Points
            when it&apos;s approved.
          </p>
        )}

        <div className="mt-6 grid gap-8 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {product.reviews.length === 0 ? (
              <p className="rounded-2xl border border-abyss-700/60 bg-abyss-900 p-8 text-center text-sm text-slate-400">
                No reviews yet — be the first and earn 50 Reef Points.
              </p>
            ) : (
              product.reviews.map((r) => (
                <article key={r.id} className="rounded-2xl border border-abyss-700/60 bg-abyss-900 p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Stars rating={r.rating} />
                    {r.title && <p className="font-semibold text-slate-200">{r.title}</p>}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {r.user.name ?? "Reef keeper"} · {r.createdAt.toLocaleDateString()}
                    {r.verified && (
                      <span className="ml-2 rounded-full bg-reef-500/15 px-2 py-0.5 text-[11px] font-semibold text-reef-300">
                        ✓ Verified purchase
                      </span>
                    )}
                  </p>
                  {r.body && <p className="mt-3 text-sm leading-relaxed text-slate-300">{r.body}</p>}
                  {r.adminReply && (
                    <div className="mt-3 rounded-xl border-l-2 border-reef-500 bg-abyss-950 p-3 text-sm">
                      <p className="text-xs font-semibold text-reef-300">AquaVida365 replied:</p>
                      <p className="mt-1 text-slate-300">{r.adminReply}</p>
                    </div>
                  )}
                </article>
              ))
            )}
          </div>

          {/* Review form */}
          <div className="rounded-2xl border border-abyss-700/60 bg-abyss-900 p-5">
            <h3 className="font-semibold text-slate-200">
              {myReview ? "Update your review" : "Write a review"}
            </h3>
            {session?.user ? (
              <form action={submitReview} className="mt-4 space-y-3">
                <input type="hidden" name="productId" value={product.id} />
                <input type="hidden" name="slug" value={product.slug} />
                <fieldset>
                  <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Rating
                  </legend>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <label key={n} className="cursor-pointer">
                        <input
                          type="radio"
                          name="rating"
                          value={n}
                          defaultChecked={(myReview?.rating ?? 5) === n}
                          className="peer sr-only"
                        />
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-abyss-700 text-sm text-slate-400 transition peer-checked:border-amber-400 peer-checked:bg-amber-400/10 peer-checked:text-amber-400">
                          {n}★
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400" htmlFor="rv-title">
                    Title
                  </label>
                  <input
                    id="rv-title"
                    name="title"
                    maxLength={120}
                    defaultValue={myReview?.title ?? ""}
                    placeholder="Colored up beautifully"
                    className="w-full rounded-lg border border-abyss-700 bg-abyss-950 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-reef-500/60 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400" htmlFor="rv-body">
                    Review
                  </label>
                  <textarea
                    id="rv-body"
                    name="body"
                    rows={4}
                    maxLength={4000}
                    defaultValue={myReview?.body ?? ""}
                    placeholder="How did it ship, acclimate, and grow?"
                    className="w-full rounded-lg border border-abyss-700 bg-abyss-950 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-reef-500/60 focus:outline-none"
                  />
                </div>
                <button className="w-full rounded-full bg-reef-500 py-2.5 text-sm font-semibold text-abyss-950 transition hover:bg-reef-400">
                  {myReview ? "Update Review" : "Submit Review"}
                </button>
                <p className="text-xs text-slate-500">
                  Reviews are moderated. Approved reviews earn 50 Reef Points.
                </p>
              </form>
            ) : (
              <p className="mt-3 text-sm text-slate-400">
                <Link
                  href={`/login?next=/product/${product.slug}`}
                  className="text-reef-400 hover:text-reef-300"
                >
                  Sign in
                </Link>{" "}
                to leave a review and earn 50 Reef Points.
              </p>
            )}
          </div>
        </div>
      </section>

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

      {/* Cross-sell */}
      {alsoBought.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-1 text-2xl font-bold">Complete your reef</h2>
          <p className="mb-4 text-sm text-slate-400">
            Popular picks that pair well with this{" "}
            {product.livestockType.toLowerCase().replace("_", " ")}.
          </p>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {alsoBought.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* Recently viewed */}
      {recentlyViewed.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-4 text-2xl font-bold">Recently viewed</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {recentlyViewed.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
