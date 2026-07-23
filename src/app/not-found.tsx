import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <div className="text-6xl">🐙</div>
      <h1 className="mt-4 font-[family-name:var(--font-display)] text-3xl font-bold">
        Lost in the deep
      </h1>
      <p className="mt-2 max-w-md text-slate-400">
        That page swam away — it may have been sold, moved, or never existed.
      </p>
      <div className="mt-8 flex gap-4">
        <Link
          href="/"
          className="rounded-full bg-coral-500 px-6 py-3 font-semibold text-white transition hover:bg-coral-600"
        >
          Back to the Reef
        </Link>
        <Link
          href="/shop"
          className="rounded-full border border-abyss-700 px-6 py-3 font-semibold text-slate-300 transition hover:bg-abyss-800"
        >
          Browse the Shop
        </Link>
      </div>
    </div>
  );
}
