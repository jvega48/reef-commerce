"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/components/ProductCard";
import { bulkEditProducts } from "@/lib/bulk-actions";

export interface BulkProduct {
  id: string;
  name: string;
  sku: string;
  slug: string;
  livestockType: string;
  inventoryMode: string;
  status: string;
  quantity: number;
  price: number;
  categories: string;
  image: string | null;
}

// Products table with row selection + a sticky bulk-action bar. Submits the
// selected ids to the bulkEditProducts server action.
export default function BulkProductTable({ products }: { products: BulkProduct[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const allSelected = products.length > 0 && selected.size === products.length;

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(products.map((p) => p.id)));

  return (
    <div>
      {selected.size > 0 && (
        <form
          action={bulkEditProducts}
          className="sticky top-0 z-10 mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-reef-500/40 bg-abyss-900 p-3 text-sm shadow-lg"
        >
          {[...selected].map((id) => (
            <input key={id} type="hidden" name="ids" value={id} />
          ))}
          <span className="font-semibold text-reef-300">{selected.size} selected</span>
          <span className="mx-1 text-slate-600">·</span>
          <select
            name="op"
            className="rounded-lg border border-abyss-700 bg-abyss-950 px-3 py-1.5 text-sm text-slate-200 focus:border-reef-500/60 focus:outline-none"
            defaultValue="activate"
          >
            <option value="activate">Set Active</option>
            <option value="draft">Set Draft</option>
            <option value="archive">Archive</option>
            <option value="feature">Feature (High-End)</option>
            <option value="unfeature">Un-feature</option>
            <option value="pricePct">Adjust price by %…</option>
          </select>
          <input
            type="number"
            name="value"
            step="0.1"
            placeholder="% (e.g. -10)"
            aria-label="Percent change"
            className="w-28 rounded-lg border border-abyss-700 bg-abyss-950 px-3 py-1.5 text-sm text-slate-200 placeholder:text-slate-500 focus:border-reef-500/60 focus:outline-none"
          />
          <button className="rounded-full bg-reef-500 px-4 py-1.5 text-sm font-semibold text-abyss-950 transition hover:bg-reef-400">
            Apply
          </button>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="text-xs text-slate-400 hover:text-coral-300"
          >
            Clear
          </button>
          <span className="ml-auto text-xs text-slate-500">
            % change applies to the current price of each selected product.
          </span>
        </form>
      )}

      <div className="overflow-x-auto rounded-xl border border-abyss-700/60">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="bg-abyss-900 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-3 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="Select all"
                  className="h-4 w-4 accent-[#14b5c8]"
                />
              </th>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Mode</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Qty</th>
              <th className="px-4 py-3 text-right">Price</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-abyss-800 bg-abyss-950">
            {products.map((p) => (
              <tr
                key={p.id}
                className={selected.has(p.id) ? "bg-reef-500/5" : "hover:bg-abyss-900"}
              >
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selected.has(p.id)}
                    onChange={() => toggle(p.id)}
                    aria-label={`Select ${p.name}`}
                    className="h-4 w-4 accent-[#14b5c8]"
                  />
                </td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-3">
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded bg-abyss-800">
                      {p.image && (
                        <Image src={p.image} alt="" fill sizes="40px" className="object-cover" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <Link
                        href={`/admin/products/${p.id}/edit`}
                        className="block truncate font-medium text-slate-200 hover:text-reef-300"
                      >
                        {p.name}
                      </Link>
                      <p className="truncate text-xs text-slate-500">{p.categories || "—"}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-2 font-mono text-xs text-slate-400">{p.sku}</td>
                <td className="px-4 py-2 text-slate-300">{p.livestockType}</td>
                <td className="px-4 py-2">
                  {p.inventoryMode === "WYSIWYG" ? (
                    <span className="rounded bg-reef-500/20 px-1.5 py-0.5 text-xs font-semibold text-reef-300">
                      WYSIWYG
                    </span>
                  ) : (
                    <span className="text-xs text-slate-500">Standard</span>
                  )}
                </td>
                <td className="px-4 py-2">
                  <span
                    className={`rounded px-1.5 py-0.5 text-xs font-semibold ${
                      p.status === "ACTIVE"
                        ? "bg-emerald-500/20 text-emerald-300"
                        : p.status === "DRAFT"
                          ? "bg-amber-500/20 text-amber-300"
                          : "bg-slate-500/20 text-slate-300"
                    }`}
                  >
                    {p.status}
                  </span>
                </td>
                <td
                  className={`px-4 py-2 text-right ${
                    p.quantity === 0 ? "text-coral-400" : "text-slate-200"
                  }`}
                >
                  {p.quantity}
                </td>
                <td className="px-4 py-2 text-right font-medium text-reef-300">
                  {formatPrice(p.price)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
