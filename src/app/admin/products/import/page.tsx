import Link from "next/link";
import { importProductsCsv } from "@/lib/bulk-actions";

export const metadata = { title: "Import Products — Admin" };

export default async function ImportProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ updated?: string; notFound?: string; error?: string }>;
}) {
  const { updated, notFound, error } = await searchParams;

  return (
    <div className="max-w-2xl">
      <Link href="/admin/products" className="text-sm text-slate-400 hover:text-reef-300">
        ← Products
      </Link>
      <h1 className="mt-2 text-2xl font-bold">Import Products (CSV)</h1>
      <p className="mt-1 text-sm text-slate-400">
        Update existing products in bulk by SKU. Export first to get a template with the
        exact columns.
      </p>

      {updated && (
        <div className="mt-4 rounded-lg border border-reef-500/40 bg-reef-500/10 px-4 py-3 text-sm text-reef-300">
          ✓ Updated {updated} product{updated === "1" ? "" : "s"}.
          {notFound && (
            <p className="mt-1 text-coral-300">
              SKUs not found (skipped): {notFound.split(",").join(", ")}
            </p>
          )}
        </div>
      )}
      {error === "nosku" && (
        <p className="mt-4 rounded-lg border border-coral-500/40 bg-coral-500/10 px-4 py-2 text-sm text-coral-300">
          The CSV needs a “SKU” column header.
        </p>
      )}
      {error === "nofile" && (
        <p className="mt-4 rounded-lg border border-coral-500/40 bg-coral-500/10 px-4 py-2 text-sm text-coral-300">
          Please choose a CSV file.
        </p>
      )}
      {error === "toobig" && (
        <p className="mt-4 rounded-lg border border-coral-500/40 bg-coral-500/10 px-4 py-2 text-sm text-coral-300">
          File too large (max 5 MB).
        </p>
      )}
      {error === "empty" && (
        <p className="mt-4 rounded-lg border border-coral-500/40 bg-coral-500/10 px-4 py-2 text-sm text-coral-300">
          That CSV has no data rows.
        </p>
      )}

      <form
        action={importProductsCsv}
        className="mt-6 space-y-4 rounded-2xl border border-abyss-700/60 bg-abyss-900 p-6"
      >
        <div>
          <label
            htmlFor="csv-file"
            className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400"
          >
            CSV file
          </label>
          <input
            id="csv-file"
            type="file"
            name="file"
            accept=".csv,text/csv"
            required
            className="block w-full text-sm text-slate-300 file:mr-4 file:rounded-full file:border-0 file:bg-reef-500 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-abyss-950 hover:file:bg-reef-400"
          />
        </div>
        <button className="rounded-full bg-coral-500 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-coral-600">
          Import &amp; Update
        </button>
      </form>

      <div className="mt-6 rounded-2xl border border-abyss-700/60 bg-abyss-900 p-5 text-sm text-slate-400">
        <h2 className="font-semibold text-slate-200">Accepted columns</h2>
        <p className="mt-2">
          <strong className="text-slate-300">SKU</strong> (required, matches existing
          products) plus any of: <strong className="text-slate-300">Price</strong>,{" "}
          <strong className="text-slate-300">Quantity</strong>,{" "}
          <strong className="text-slate-300">Status</strong> (DRAFT/ACTIVE/ARCHIVED/SOLD),{" "}
          <strong className="text-slate-300">Compare At</strong>,{" "}
          <strong className="text-slate-300">Cost</strong>. Missing columns and blank
          cells are left unchanged. Unknown SKUs are reported, never created.
        </p>
        <a
          href="/api/admin/export?what=products"
          className="mt-3 inline-block text-reef-400 hover:text-reef-300"
        >
          ⬇ Download current products as a template
        </a>
      </div>
    </div>
  );
}
