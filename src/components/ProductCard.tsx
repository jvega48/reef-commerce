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
  images: { url: string; alt: string | null }[];
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
      className="group overflow-hidden rounded-xl border border-abyss-700/60 bg-abyss-900 transition hover:border-reef-500/60"
    >
      <div className="relative aspect-square overflow-hidden bg-abyss-800">
        {img ? (
          <Image
            src={img.url}
            alt={img.alt ?? product.name}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl">🪸</div>
        )}
        <div className="absolute left-2 top-2 flex flex-col gap-1">
          {product.inventoryMode === "WYSIWYG" && (
            <span className="rounded bg-reef-500 px-2 py-0.5 text-xs font-bold text-abyss-950">
              WYSIWYG
            </span>
          )}
          {onSale && (
            <span className="rounded bg-coral-500 px-2 py-0.5 text-xs font-bold text-white">
              SALE
            </span>
          )}
        </div>
        {soldOut && (
          <div className="absolute inset-0 flex items-center justify-center bg-abyss-950/70">
            <span className="rounded border border-slate-500 px-3 py-1 text-sm font-semibold text-slate-300">
              Sold Out
            </span>
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="truncate text-sm font-medium text-slate-200 group-hover:text-reef-300">
          {product.name}
        </p>
        <p className="mt-1 text-sm">
          <span className="font-bold text-reef-300">{formatPrice(product.price)}</span>
          {onSale && (
            <span className="ml-2 text-xs text-slate-500 line-through">
              {formatPrice(product.compareAtPrice)}
            </span>
          )}
        </p>
      </div>
    </Link>
  );
}
