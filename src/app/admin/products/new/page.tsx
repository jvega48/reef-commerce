import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createProduct } from "@/lib/admin-actions";
import ProductForm from "@/components/admin/ProductForm";

export const metadata = { title: "New Product — Admin" };

export default async function NewProductPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ error }, categories] = await Promise.all([
    searchParams,
    prisma.category.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  return (
    <div className="max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">New Product</h1>
          <p className="mt-1 text-sm text-slate-400">
            Add a coral, fish, invert, or dry good to the store.
          </p>
        </div>
        <Link href="/admin/products" className="text-sm text-slate-400 hover:text-reef-300">
          ← Back to products
        </Link>
      </div>

      {error === "name" && (
        <p className="mb-4 rounded-lg border border-coral-500/40 bg-coral-500/10 px-4 py-2 text-sm text-coral-300">
          A product name is required.
        </p>
      )}

      <ProductForm action={createProduct} categories={categories} submitLabel="Create Product" />
    </div>
  );
}
