"use client";

import { useEffect, useRef, useState } from "react";

interface SearchResult {
  id: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  inventoryMode: string;
  image: string | null;
}

interface Line extends SearchResult {
  orderQty: number;
}

export default function OrderBuilder() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const boxRef = useRef<HTMLDivElement>(null);

  // Debounced product search
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(async () => {
      const res = await fetch(
        `/api/admin/products/search?q=${encodeURIComponent(query)}`,
      );
      if (res.ok) setResults(await res.json());
    }, 250);
    return () => clearTimeout(t);
  }, [query, open]);

  // Close dropdown on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function addLine(p: SearchResult) {
    setLines((prev) => {
      const existing = prev.find((l) => l.id === p.id);
      if (existing) {
        if (p.inventoryMode === "WYSIWYG") return prev;
        return prev.map((l) =>
          l.id === p.id
            ? { ...l, orderQty: Math.min(l.orderQty + 1, l.quantity) }
            : l,
        );
      }
      return [...prev, { ...p, orderQty: 1 }];
    });
    setOpen(false);
    setQuery("");
  }

  function setQty(id: string, qty: number) {
    setLines((prev) =>
      prev.map((l) =>
        l.id === id
          ? { ...l, orderQty: Math.max(1, Math.min(qty || 1, l.quantity)) }
          : l,
      ),
    );
  }

  const subtotal = lines.reduce((sum, l) => sum + l.price * l.orderQty, 0);

  return (
    <div>
      <input
        type="hidden"
        name="itemsJson"
        value={JSON.stringify(lines.map((l) => ({ productId: l.id, quantity: l.orderQty })))}
      />

      {/* Search */}
      <div ref={boxRef} className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Search products by name or SKU to add…"
          className="w-full rounded-lg border border-abyss-700 bg-abyss-950 px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:border-reef-500/60 focus:outline-none"
        />
        {open && results.length > 0 && (
          <div className="absolute z-20 mt-1 max-h-80 w-full overflow-y-auto rounded-xl border border-abyss-600 bg-abyss-900 shadow-2xl shadow-black/50">
            {results.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => addLine(p)}
                className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-abyss-800"
              >
                {p.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image} alt="" className="h-9 w-9 rounded object-cover" />
                ) : (
                  <span className="flex h-9 w-9 items-center justify-center rounded bg-abyss-800">🪸</span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-slate-200">{p.name}</span>
                  <span className="text-xs text-slate-500">
                    {p.sku} · {p.quantity} in stock
                    {p.inventoryMode === "WYSIWYG" && " · WYSIWYG"}
                  </span>
                </span>
                <span className="font-semibold text-reef-300">${p.price.toFixed(2)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Line items */}
      {lines.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-abyss-600 px-4 py-6 text-center text-sm text-slate-500">
          No items yet — search above to add products to this order.
        </p>
      ) : (
        <div className="mt-4 divide-y divide-abyss-800 rounded-xl border border-abyss-700/60">
          {lines.map((l) => (
            <div key={l.id} className="flex items-center gap-3 px-3 py-2.5 text-sm">
              {l.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={l.image} alt="" className="h-10 w-10 rounded object-cover" />
              ) : (
                <span className="flex h-10 w-10 items-center justify-center rounded bg-abyss-800">🪸</span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-slate-200">{l.name}</p>
                <p className="text-xs text-slate-500">
                  {l.sku} · ${l.price.toFixed(2)} each
                </p>
              </div>
              {l.inventoryMode === "WYSIWYG" ? (
                <span className="rounded bg-reef-500/20 px-2 py-0.5 text-xs font-semibold text-reef-300">
                  ×1 WYSIWYG
                </span>
              ) : (
                <input
                  type="number"
                  min={1}
                  max={l.quantity}
                  value={l.orderQty}
                  onChange={(e) => setQty(l.id, Number(e.target.value))}
                  className="w-16 rounded-lg border border-abyss-700 bg-abyss-950 px-2 py-1.5 text-center"
                />
              )}
              <span className="w-20 text-right font-semibold text-reef-300">
                ${(l.price * l.orderQty).toFixed(2)}
              </span>
              <button
                type="button"
                onClick={() => setLines((prev) => prev.filter((x) => x.id !== l.id))}
                className="text-slate-500 hover:text-coral-400"
                aria-label="Remove line"
              >
                ✕
              </button>
            </div>
          ))}
          <div className="flex justify-end px-3 py-2.5 text-sm">
            <span className="text-slate-400">
              Items subtotal:&nbsp;
              <span className="font-bold text-reef-300">${subtotal.toFixed(2)}</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
