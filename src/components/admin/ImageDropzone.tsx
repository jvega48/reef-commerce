"use client";

import { useRef, useState } from "react";

interface Preview {
  url: string;
  name: string;
  isVideo: boolean;
}

export default function ImageDropzone() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<Preview[]>([]);
  const [dragging, setDragging] = useState(false);

  function syncPreviews(files: FileList | null) {
    if (!files) return setPreviews([]);
    setPreviews(
      Array.from(files).map((f) => ({
        url: URL.createObjectURL(f),
        name: f.name,
        isVideo: f.type.startsWith("video/"),
      })),
    );
  }

  function addFiles(added: FileList) {
    const input = inputRef.current;
    if (!input) return;
    const dt = new DataTransfer();
    for (const f of Array.from(input.files ?? [])) dt.items.add(f);
    for (const f of Array.from(added)) {
      if (f.type.startsWith("image/") || f.type.startsWith("video/")) dt.items.add(f);
    }
    input.files = dt.files;
    syncPreviews(dt.files);
  }

  function removeAt(index: number) {
    const input = inputRef.current;
    if (!input?.files) return;
    const dt = new DataTransfer();
    Array.from(input.files).forEach((f, i) => {
      if (i !== index) dt.items.add(f);
    });
    input.files = dt.files;
    syncPreviews(dt.files);
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          addFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition ${
          dragging
            ? "border-reef-400 bg-reef-500/10"
            : "border-abyss-600 bg-abyss-900 hover:border-reef-500/60 hover:bg-abyss-800"
        }`}
      >
        <div className="text-3xl">📸</div>
        <p className="mt-2 text-sm font-medium text-slate-200">
          Drag &amp; drop photos or videos here
        </p>
        <p className="mt-1 text-xs text-slate-500">or click to browse — JPG, PNG, WebP, MP4</p>
        <input
          ref={inputRef}
          type="file"
          name="images"
          multiple
          accept="image/*,video/*"
          className="hidden"
          onChange={(e) => syncPreviews(e.currentTarget.files)}
        />
      </div>

      {previews.length > 0 && (
        <div className="mt-3 grid grid-cols-4 gap-3 md:grid-cols-6">
          {previews.map((p, i) => (
            <div
              key={p.url}
              className="group relative aspect-square overflow-hidden rounded-lg border border-abyss-700 bg-abyss-800"
            >
              {p.isVideo ? (
                <video src={p.url} className="h-full w-full object-cover" muted />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.url} alt={p.name} className="h-full w-full object-cover" />
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeAt(i);
                }}
                className="absolute right-1 top-1 hidden h-6 w-6 items-center justify-center rounded-full bg-abyss-950/90 text-xs text-coral-300 group-hover:flex"
                aria-label={`Remove ${p.name}`}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
