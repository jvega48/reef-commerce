"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { bulkDeleteImages, bulkReassignImages } from "@/lib/media-actions";

export interface MediaItem {
  id: string;
  url: string;
  thumbUrl: string | null;
  alt: string | null;
  position: number;
  width: number | null;
  height: number | null;
  bytes: number | null;
  isVideo: boolean;
  createdAt: string;
  productId: string;
  productName: string;
  productSlug: string;
  livestockType: string;
  categories: string;
}

// Media library with grid/list views and bulk operations. Selection state is
// client-side; the bulk actions post the chosen ids to server actions.
export default function MediaLibrary({
  items,
  view,
}: {
  items: MediaItem[];
  view: "grid" | "list";
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [reassignOpen, setReassignOpen] = useState(false);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const allSelected = items.length > 0 && selected.size === items.length;
  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(items.map((i) => i.id)));

  const hiddenIds = [...selected].map((id) => (
    <input key={id} type="hidden" name="ids" value={id} />
  ));

  return (
    <div>
      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="sticky top-0 z-20 mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-reef-500/40 bg-abyss-900 p-3 text-sm shadow-lg">
          <span className="font-semibold text-reef-300">{selected.size} selected</span>

          <button
            type="button"
            onClick={() => setReassignOpen((v) => !v)}
            className="rounded-full bg-abyss-700 px-4 py-1.5 text-xs font-semibold text-slate-200 hover:bg-abyss-600"
          >
            Move to product…
          </button>

          <form
            action={bulkDeleteImages}
            onSubmit={(e) => {
              if (
                !confirm(
                  `Delete ${selected.size} image(s)? The files are removed from storage too. This cannot be undone.`,
                )
              ) {
                e.preventDefault();
              }
            }}
          >
            {hiddenIds}
            <button className="rounded-full bg-coral-500/15 px-4 py-1.5 text-xs font-semibold text-coral-300 hover:bg-coral-500/25">
              Delete selected
            </button>
          </form>

          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="text-xs text-slate-400 hover:text-coral-300"
          >
            Clear
          </button>
        </div>
      )}

      {reassignOpen && selected.size > 0 && (
        <form
          action={bulkReassignImages}
          className="mb-3 flex flex-wrap items-end gap-2 rounded-xl border border-abyss-700 bg-abyss-900 p-3"
        >
          {hiddenIds}
          <div className="flex-1">
            <label
              htmlFor="target-product"
              className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400"
            >
              Move {selected.size} image(s) to product ID
            </label>
            <input
              id="target-product"
              name="targetProductId"
              required
              placeholder="Paste a product id (from its admin URL)"
              className="w-full rounded-lg border border-abyss-700 bg-abyss-950 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-reef-500/60 focus:outline-none"
            />
            <p className="mt-1 text-xs text-slate-500">
              An image&apos;s category comes from the product that owns it — moving it
              here is how a miscategorized asset gets corrected.
            </p>
          </div>
          <button className="rounded-full bg-reef-500 px-5 py-2 text-sm font-semibold text-abyss-950 hover:bg-reef-400">
            Move
          </button>
        </form>
      )}

      <div className="mb-2 flex items-center gap-2 text-xs text-slate-400">
        <input
          type="checkbox"
          checked={allSelected}
          onChange={toggleAll}
          aria-label="Select all on this page"
          className="h-4 w-4 accent-[#14b5c8]"
        />
        Select all on this page ({items.length})
      </div>

      {items.length === 0 ? (
        <p className="rounded-xl border border-abyss-700/60 bg-abyss-900 px-4 py-12 text-center text-slate-400">
          No media matches those filters.
        </p>
      ) : view === "grid" ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {items.map((m) => (
            <li
              key={m.id}
              className={`overflow-hidden rounded-xl border bg-abyss-950 transition ${
                selected.has(m.id) ? "border-reef-500" : "border-abyss-700"
              }`}
            >
              <div className="relative aspect-square bg-abyss-800">
                {m.isVideo ? (
                  <video src={m.url} className="h-full w-full object-cover" muted playsInline />
                ) : (
                  <Image
                    src={m.thumbUrl ?? m.url}
                    alt={m.alt ?? ""}
                    fill
                    sizes="(max-width: 768px) 50vw, 20vw"
                    className="object-cover"
                  />
                )}
                <input
                  type="checkbox"
                  checked={selected.has(m.id)}
                  onChange={() => toggle(m.id)}
                  aria-label={`Select image of ${m.productName}`}
                  className="absolute left-2 top-2 h-4 w-4 accent-[#14b5c8]"
                />
                {m.position === 0 && (
                  <span className="absolute right-1.5 top-1.5 rounded-full bg-reef-500 px-1.5 py-0.5 text-[9px] font-bold text-abyss-950">
                    PRIMARY
                  </span>
                )}
              </div>
              <div className="p-2">
                <Link
                  href={`/admin/products/${m.productId}/edit`}
                  className="block truncate text-xs font-medium text-slate-200 hover:text-reef-300"
                  title={m.productName}
                >
                  {m.productName}
                </Link>
                <p className="truncate text-[10px] text-slate-500">
                  {m.livestockType}
                  {m.categories ? ` · ${m.categories}` : ""}
                </p>
                <p className="text-[10px] text-slate-600">
                  {m.width && m.height ? `${m.width}×${m.height}` : "—"}
                  {m.bytes ? ` · ${(m.bytes / 1024).toFixed(0)} KB` : ""}
                </p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-abyss-700/60">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-abyss-900 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-3 py-3" />
                <th className="px-3 py-3">Preview</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Categories</th>
                <th className="px-4 py-3 text-right">Size</th>
                <th className="px-4 py-3 text-right">Added</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-abyss-800 bg-abyss-950">
              {items.map((m) => (
                <tr key={m.id} className={selected.has(m.id) ? "bg-reef-500/5" : "hover:bg-abyss-900"}>
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selected.has(m.id)}
                      onChange={() => toggle(m.id)}
                      aria-label={`Select image of ${m.productName}`}
                      className="h-4 w-4 accent-[#14b5c8]"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="relative h-12 w-12 overflow-hidden rounded bg-abyss-800">
                      {!m.isVideo && (
                        <Image
                          src={m.thumbUrl ?? m.url}
                          alt={m.alt ?? ""}
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <Link
                      href={`/admin/products/${m.productId}/edit`}
                      className="text-slate-200 hover:text-reef-300"
                    >
                      {m.productName}
                    </Link>
                    {m.position === 0 && (
                      <span className="ml-2 rounded bg-reef-500/20 px-1.5 py-0.5 text-[10px] font-bold text-reef-300">
                        PRIMARY
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-xs text-slate-400">{m.livestockType}</td>
                  <td className="px-4 py-2 text-xs text-slate-400">{m.categories || "—"}</td>
                  <td className="px-4 py-2 text-right text-xs text-slate-400">
                    {m.bytes ? `${(m.bytes / 1024).toFixed(0)} KB` : "—"}
                  </td>
                  <td className="px-4 py-2 text-right text-xs text-slate-500">
                    {new Date(m.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
