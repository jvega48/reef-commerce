import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { deleteProduct, updateProduct } from "@/lib/admin-actions";
import { storageBackend } from "@/lib/storage";
import ProductForm from "@/components/admin/ProductForm";
import ProductImageManager from "@/components/admin/ProductImageManager";

export const metadata = { title: "Edit Product — Admin" };

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    saved?: string;
    created?: string;
    error?: string;
    uploadError?: string;
  }>;
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
      {flags.uploadError && (
        <p className="mb-4 rounded-lg border border-coral-500/40 bg-coral-500/10 px-4 py-2 text-sm text-coral-300">
          Some files were not added — {flags.uploadError}
        </p>
      )}

      {/* Image manager (separate forms — cannot nest inside the main form) */}
      <section className="mb-8 rounded-2xl border border-abyss-700/60 bg-abyss-900 p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold text-slate-200">
            Images ({product.images.length})
          </h2>
          <span
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
              storageBackend() === "r2"
                ? "bg-emerald-500/20 text-emerald-300"
                : "bg-amber-500/20 text-amber-300"
            }`}
            title={
              storageBackend() === "r2"
                ? "Uploads go to Cloudflare R2 and survive deploys"
                : "Uploads write to public/uploads — fine locally, but they are lost on redeploy in serverless hosting. Set R2_* to fix."
            }
          >
            storage: {storageBackend() === "r2" ? "Cloudflare R2" : "local disk (dev)"}
          </span>
        </div>
        <ProductImageManager productId={product.id} images={product.images} />
      </section>

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
