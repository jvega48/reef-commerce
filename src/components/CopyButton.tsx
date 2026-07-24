"use client";

import { useState } from "react";

export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          /* clipboard unavailable (http) — user can select manually */
        }
      }}
      className="rounded-full bg-reef-500 px-5 py-2.5 text-sm font-semibold text-abyss-950 transition hover:bg-reef-400"
    >
      {copied ? "Copied ✓" : "Copy link"}
    </button>
  );
}
