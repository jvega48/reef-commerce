"use client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <div className="text-6xl">🌊</div>
      <h1 className="mt-4 font-[family-name:var(--font-display)] text-3xl font-bold">
        Rough waters
      </h1>
      <p className="mt-2 max-w-md text-slate-400">
        Something went wrong on our end. Your cart and account are safe — try again.
      </p>
      {error.digest && (
        <p className="mt-2 font-mono text-xs text-slate-600">ref: {error.digest}</p>
      )}
      <button
        onClick={reset}
        className="mt-8 rounded-full bg-coral-500 px-6 py-3 font-semibold text-white transition hover:bg-coral-600"
      >
        Try Again
      </button>
    </div>
  );
}
