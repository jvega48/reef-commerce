"use client";

import { useActionState } from "react";
import { subscribeNewsletter, type NewsletterState } from "@/lib/newsletter-actions";

export default function NewsletterForm({ source = "footer" }: { source?: string }) {
  const [state, formAction, pending] = useActionState<NewsletterState, FormData>(
    subscribeNewsletter,
    null,
  );

  if (state?.ok) {
    return (
      <p className="w-full max-w-md rounded-full border border-reef-500/40 bg-reef-500/10 px-6 py-2.5 text-center text-sm text-reef-300" role="status">
        {state.message}
      </p>
    );
  }

  return (
    <div className="w-full max-w-md">
      <form action={formAction} className="flex gap-2">
        <input type="hidden" name="source" value={source} />
        <label htmlFor={`newsletter-email-${source}`} className="sr-only">
          Email address
        </label>
        <input
          id={`newsletter-email-${source}`}
          type="email"
          name="email"
          required
          placeholder="you@reef.com"
          className="flex-1 rounded-full border border-abyss-700 bg-abyss-950 px-5 py-2.5 text-sm placeholder:text-slate-500 focus:border-reef-500/60 focus:outline-none"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-coral-500 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-coral-600 disabled:opacity-60"
        >
          {pending ? "…" : "Subscribe"}
        </button>
      </form>
      {state && !state.ok && (
        <p className="mt-2 text-center text-xs text-coral-300" role="alert">{state.message}</p>
      )}
    </div>
  );
}
