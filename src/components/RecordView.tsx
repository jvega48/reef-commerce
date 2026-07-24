"use client";

import { useEffect } from "react";

/** Records a product view for the recently-viewed list. Renders nothing. */
export default function RecordView({ slug }: { slug: string }) {
  useEffect(() => {
    fetch("/api/recently-viewed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
    }).catch(() => {});
  }, [slug]);
  return null;
}
