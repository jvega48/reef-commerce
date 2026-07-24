"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

type Suggestion = {
  name: string;
  slug: string;
  price: number;
  soldOut: boolean;
  image: string | null;
};

/** Header search with debounced FTS autocomplete. Falls back to a plain
 *  GET /shop?q= submit, so it works without JavaScript too. */
export default function SearchBox() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    const t = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data = await res.json();
        setResults(data.results ?? []);
        setOpen((data.results ?? []).length > 0);
        setHighlighted(-1);
      } catch {
        /* aborted or offline — ignore */
      }
    }, 180);
    return () => clearTimeout(t);
  }, [q]);

  // Close on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const go = (slug: string) => {
    setOpen(false);
    setQ("");
    router.push(`/product/${slug}`);
  };

  return (
    <div ref={boxRef} className="relative">
      <form
        action="/shop"
        onSubmit={() => setOpen(false)}
        role="search"
      >
        <div className="relative">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
          </svg>
          <input
            type="search"
            name="q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => results.length > 0 && setOpen(true)}
            onKeyDown={(e) => {
              if (!open) return;
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setHighlighted((h) => Math.min(h + 1, results.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setHighlighted((h) => Math.max(h - 1, -1));
              } else if (e.key === "Enter" && highlighted >= 0) {
                e.preventDefault();
                go(results[highlighted].slug);
              } else if (e.key === "Escape") {
                setOpen(false);
              }
            }}
            aria-label="Search products"
            aria-expanded={open}
            aria-autocomplete="list"
            role="combobox"
            aria-controls="search-suggestions"
            placeholder="Search the reef…"
            className="w-52 rounded-full border border-abyss-700/80 bg-abyss-900/80 py-2 pl-9 pr-4 text-sm text-slate-200 placeholder:text-slate-500 transition focus:w-64 focus:border-reef-500/60 focus:outline-none"
          />
        </div>
      </form>

      {open && (
        <ul
          id="search-suggestions"
          role="listbox"
          className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-abyss-700 bg-abyss-900 shadow-2xl shadow-black/40"
        >
          {results.map((r, i) => (
            <li key={r.slug} role="option" aria-selected={i === highlighted}>
              <button
                type="button"
                onClick={() => go(r.slug)}
                onMouseEnter={() => setHighlighted(i)}
                className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition ${
                  i === highlighted ? "bg-abyss-800" : ""
                }`}
              >
                <span className="relative block h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-abyss-800">
                  {r.image && (
                    <Image src={r.image} alt="" fill sizes="40px" className="object-cover" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-slate-200">{r.name}</span>
                  <span className="text-xs text-slate-500">
                    {r.soldOut ? "Sold out" : `$${r.price.toFixed(2)}`}
                  </span>
                </span>
              </button>
            </li>
          ))}
          <li className="border-t border-abyss-800">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                router.push(`/shop?q=${encodeURIComponent(q)}`);
              }}
              className="block w-full px-3 py-2.5 text-left text-xs font-semibold text-reef-400 hover:bg-abyss-800"
            >
              See all results for “{q}” →
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
