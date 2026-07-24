import Link from "next/link";
import Image from "next/image";

export interface ProductCardData {
  slug: string;
  name: string;
  price: unknown; // Prisma Decimal
  compareAtPrice: unknown | null;
  quantity: number;
  inventoryMode: string;
  featured: boolean;
  // images[0] is the primary — every query orders by position ASC and
  // positions are kept dense and 0-based.
  images: { url: string; thumbUrl?: string | null; alt: string | null }[];
}

export function formatPrice(value: unknown): string {
  return `$${Number(value).toFixed(2)}`;
}

export default function ProductCard({ product }: { product: ProductCardData }) {
  const img = product.images[0];
  const soldOut = product.quantity < 1;
  const onSale =
    product.compareAtPrice != null && Number(product.compareAtPrice) > Number(product.price);

  return (
    <Link
      href={`/product/${product.slug}`}
      className="group overflow-hidden rounded-2xl border border-abyss-700/50 bg-abyss-900 transition duration-300 hover:-translate-y-1 hover:border-reef-500/50 hover:shadow-xl hover:shadow-reef-500/10"
    >
      <div className="relative aspect-square overflow-hidden bg-abyss-800">
        {img ? (
          <Image
            // Prefer the generated 400px thumbnail; the migrated Shopify
            // catalog has none, so fall back to the full-size URL.
            src={img.thumbUrl ?? img.url}
            alt={img.alt ?? product.name}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover transition duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl">🪸</div>
        )}
        {/* subtle bottom gradient for readability */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-abyss-950/60 to-transparent" />
        <div className="absolute left-2.5 top-2.5 flex flex-col items-start gap-1.5">
          {product.inventoryMode === "WYSIWYG" && (
            <span className="rounded-full bg-reef-500 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-abyss-950 shadow-lg shadow-reef-500/30">
              WYSIWYG
            </span>
          )}
          {product.featured && (
            <span className="rounded-full bg-abyss-950/70 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-coral-300 ring-1 ring-coral-400/40 backdrop-blur">
              High End
            </span>
          )}
          {onSale && (
            <span className="rounded-full bg-coral-500 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white shadow-lg shadow-coral-500/30">
              Sale
            </span>
          )}
        </div>
        {soldOut && (
          <div className="absolute inset-0 flex items-center justify-center bg-abyss-950/70 backdrop-blur-[2px]">
            <span className="rounded-full border border-slate-500/70 px-4 py-1.5 text-sm font-semibold text-slate-200">
              Sold Out
            </span>
          </div>
        )}
      </div>
      <div className="p-3.5">
        <p className="truncate text-sm font-medium text-slate-200 transition group-hover:text-reef-300">
          {product.name}
        </p>
        <p className="mt-1.5 flex items-baseline gap-2">
          <span className="font-[family-name:var(--font-display)] text-base font-bold text-reef-300">
            {formatPrice(product.price)}
          </span>
          {onSale && (
            <span className="text-xs text-slate-500 line-through">
              {formatPrice(product.compareAtPrice)}
            </span>
          )}
        </p>
      </div>
    </Link>
  );
}
