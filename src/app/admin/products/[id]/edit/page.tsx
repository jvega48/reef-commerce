import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  deleteProduct,
  deleteProductImage,
  updateProduct,
} from "@/lib/admin-actions";
import ProductForm from "@/components/admin/ProductForm";

export const metadata = { title: "Edit Product — Admin" };

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; created?: string; error?: string }>;
}) {
  const [{ id }, flags] = await Promise.all([params, searchParams]);
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      images: { orderBy: { position: "asc" } },
      categories: true,
    },
  });
  if (!product) notFound();

  const categories = await prisma.category.findMany({ orderBy: { sortOrder: "asc" } });

  return (
    <div className="max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Edit Product</h1>
          <p className="mt-1 text-sm text-slate-400">
            {product.sku} ·{" "}
            <Link
              href={`/product/${product.slug}`}
              className="text-reef-400 hover:text-reef-300"
            >
              View on storefront →
            </Link>
          </p>
        </div>
        <Link href="/admin/products" className="text-sm text-slate-400 hover:text-reef-300">
          ← Back to products
        </Link>
      </div>

      {(flags.saved || flags.created) && (
        <p className="mb-4 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300">
          {flags.created ? "Product created." : "Changes saved."}
        </p>
      )}
      {flags.error === "name" && (
        <p className="mb-4 rounded-lg border border-coral-500/40 bg-coral-500/10 px-4 py-2 text-sm text-coral-300">
          A product name is required.
        </p>
      )}

      {/* Existing images (separate forms — cannot nest inside the main form) */}
      {product.images.length > 0 && (
        <section className="mb-8 rounded-2xl border border-abyss-700/60 bg-abyss-900 p-5">
          <h2 className="mb-4 font-semibold text-slate-200">Current Images</h2>
          <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
            {product.images.map((img) => (
              <div
                key={img.id}
                className="group relative aspect-square overflow-hidden rounded-lg border border-abyss-700 bg-abyss-800"
              >
                <Image
                  src={img.url}
                  alt={img.alt ?? product.name}
                  fill
                  sizes="15vw"
                  className="object-cover"
                />
                <form action={deleteProductImage} className="absolute right-1 top-1 hidden group-hover:block">
                  <input type="hidden" name="imageId" value={img.id} />
                  <button
                    type="submit"
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-abyss-950/90 text-xs text-coral-300 hover:bg-coral-500 hover:text-white"
                    aria-label="Delete image"
                  >
                    ✕
                  </button>
                </form>
              </div>
            ))}
          </div>
        </section>
      )}

      <ProductForm
        action={updateProduct}
        product={product}
        categories={categories}
        selectedCategoryIds={product.categories.map((c) => c.categoryId)}
        submitLabel="Save Changes"
      />

      {/* Danger zone */}
      <details className="mt-10 rounded-2xl border border-coral-500/30 bg-abyss-900 p-5">
        <summary className="cursor-pointer text-sm font-semibold text-coral-300">
          Danger zone
        </summary>
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-slate-400">
            Permanently delete this product and its images. Order history is preserved.
          </p>
          <form action={deleteProduct}>
            <input type="hidden" name="productId" value={product.id} />
            <button
              type="submit"
              className="rounded-full border border-coral-500/60 px-5 py-2 text-sm font-semibold text-coral-300 transition hover:bg-coral-500 hover:text-white"
            >
              Delete Product
            </button>
          </form>
        </div>
      </details>
    </div>
  );
}
