"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import {
  deleteProductImage,
  moveProductImage,
  reorderProductImages,
  updateImageAlt,
} from "@/lib/admin-actions";

export interface ManagedImage {
  id: string;
  url: string;
  thumbUrl: string | null;
  alt: string | null;
  position: number;
  width: number | null;
  height: number | null;
  bytes: number | null;
  isVideo: boolean;
}

// Image grid with drag-to-reorder, primary promotion, alt text, replace and
// delete. The first tile (position 0) is what every storefront surface shows,
// so it's labelled explicitly rather than left implicit.
export default function ProductImageManager({
  productId,
  images,
}: {
  productId: string;
  images: ManagedImage[];
}) {
  const [order, setOrder] = useState(images);
  const [dragId, setDragId] = useState<string | null>(null);
  const [editingAlt, setEditingAlt] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Keep local order in sync when the server sends a new list.
  const serverKey = images.map((i) => i.id).join(",");
  const [lastKey, setLastKey] = useState(serverKey);
  if (serverKey !== lastKey) {
    setLastKey(serverKey);
    setOrder(images);
  }

  function onDrop(targetId: string) {
    if (!dragId || dragId === targetId) return;
    const next = [...order];
    const from = next.findIndex((i) => i.id === dragId);
    const to = next.findIndex((i) => i.id === targetId);
    if (from === -1 || to === -1) return;
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setOrder(next);
    setDragId(null);

    const fd = new FormData();
    fd.set("productId", productId);
    fd.set("order", JSON.stringify(next.map((i) => i.id)));
    startTransition(() => {
      reorderProductImages(fd);
    });
  }

  if (images.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-abyss-700 px-4 py-8 text-center text-sm text-slate-500">
        No images yet — add some below.
      </p>
    );
  }

  return (
    <div>
      <p className="mb-3 text-xs text-slate-500">
        Drag tiles to reorder. The first image is the primary one shown on cards,
        search results, cart, and checkout.
      </p>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {order.map((img, i) => (
          <li
            key={img.id}
            draggable
            onDragStart={() => setDragId(img.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(img.id)}
            onDragEnd={() => setDragId(null)}
            className={`group relative rounded-xl border bg-abyss-950 transition ${
              dragId === img.id
                ? "border-reef-400 opacity-50"
                : i === 0
                  ? "border-reef-500/60"
                  : "border-abyss-700"
            }`}
          >
            <div className="relative aspect-square overflow-hidden rounded-t-xl bg-abyss-800">
              {img.isVideo ? (
                <video
                  src={img.url}
                  className="h-full w-full object-cover"
                  muted
                  playsInline
                />
              ) : (
                <Image
                  src={img.thumbUrl ?? img.url}
                  alt={img.alt ?? ""}
                  fill
                  sizes="(max-width: 768px) 50vw, 25vw"
                  className="object-cover"
                />
              )}
              {i === 0 && (
                <span className="absolute left-1.5 top-1.5 rounded-full bg-reef-500 px-2 py-0.5 text-[10px] font-bold text-abyss-950">
                  PRIMARY
                </span>
              )}
              {img.isVideo && (
                <span className="absolute right-1.5 top-1.5 rounded bg-abyss-950/80 px-1.5 py-0.5 text-[10px] font-bold text-slate-200">
                  VIDEO
                </span>
              )}
            </div>

            <div className="space-y-1.5 p-2">
              {/* Alt text */}
              {editingAlt === img.id ? (
                <form
                  action={updateImageAlt}
                  onSubmit={() => setEditingAlt(null)}
                  className="flex gap-1"
                >
                  <input type="hidden" name="imageId" value={img.id} />
                  <input
                    name="alt"
                    defaultValue={img.alt ?? ""}
                    autoFocus
                    maxLength={200}
                    placeholder="Describe the image"
                    aria-label="Alt text"
                    className="w-full rounded border border-abyss-700 bg-abyss-900 px-1.5 py-1 text-[11px] text-slate-200 focus:border-reef-500/60 focus:outline-none"
                  />
                  <button className="rounded bg-reef-500 px-2 text-[11px] font-bold text-abyss-950">
                    ✓
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditingAlt(img.id)}
                  className="block w-full truncate text-left text-[11px] text-slate-400 hover:text-reef-300"
                  title="Edit alt text (accessibility + SEO)"
                >
                  {img.alt ? `alt: ${img.alt}` : "＋ add alt text"}
                </button>
              )}

              <p className="text-[10px] text-slate-600">
                {img.width && img.height ? `${img.width}×${img.height}` : "—"}
                {img.bytes ? ` · ${(img.bytes / 1024).toFixed(0)} KB` : ""}
              </p>

              <div className="flex items-center gap-1">
                {i !== 0 && (
                  <form action={moveProductImage}>
                    <input type="hidden" name="imageId" value={img.id} />
                    <input type="hidden" name="direction" value="primary" />
                    <button
                      className="rounded bg-abyss-800 px-1.5 py-1 text-[10px] font-semibold text-reef-300 hover:bg-abyss-700"
                      title="Make primary"
                    >
                      ★
                    </button>
                  </form>
                )}
                <form action={moveProductImage}>
                  <input type="hidden" name="imageId" value={img.id} />
                  <input type="hidden" name="direction" value="up" />
                  <button
                    disabled={i === 0}
                    className="rounded bg-abyss-800 px-1.5 py-1 text-[10px] text-slate-300 hover:bg-abyss-700 disabled:opacity-30"
                    title="Move earlier"
                  >
                    ←
                  </button>
                </form>
                <form action={moveProductImage}>
                  <input type="hidden" name="imageId" value={img.id} />
                  <input type="hidden" name="direction" value="down" />
                  <button
                    disabled={i === order.length - 1}
                    className="rounded bg-abyss-800 px-1.5 py-1 text-[10px] text-slate-300 hover:bg-abyss-700 disabled:opacity-30"
                    title="Move later"
                  >
                    →
                  </button>
                </form>
                <form action={deleteProductImage} className="ml-auto">
                  <input type="hidden" name="imageId" value={img.id} />
                  <button
                    className="rounded bg-abyss-800 px-1.5 py-1 text-[10px] text-coral-300 hover:bg-coral-500 hover:text-white"
                    title="Delete image"
                  >
                    ✕
                  </button>
                </form>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
