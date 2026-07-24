import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getStoreInfoSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "AquaVida365 — a hands-on saltwater livestock company shipping premium corals, rare fish, and reef-safe inverts overnight, 365 days a year.",
  alternates: { canonical: "/about" },
};

export default async function AboutPage() {
  const info = await getStoreInfoSettings();

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="text-center">
        <Image
          src="/brand/logo.png"
          alt="AquaVida365"
          width={120}
          height={152}
          className="mx-auto h-auto w-28"
        />
        <h1 className="mt-6 font-[family-name:var(--font-display)] text-4xl font-extrabold">
          Aqua life, <span className="text-gradient">365 days a year</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-slate-400">
          AquaVida365 started the way most good reef stories do: one tank became
          three, three became a fish room, and the fish room became a business
          built on a simple promise — ship animals we&apos;d be proud to put in
          our own displays.
        </p>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {[
          [
            "🪸",
            "Hand-picked livestock",
            "Every coral is grown out or conditioned in our systems. WYSIWYG listings are photographed in our tanks — the exact specimen you see is the one that arrives.",
          ],
          [
            "📦",
            "Overnight, insulated, guaranteed",
            "Live orders ship Tuesday and Wednesday in insulated boxes with heat or cold packs, overnight to your door, covered by our live-arrival guarantee.",
          ],
          [
            "🤝",
            "Real support from real reefers",
            "Text us on a Saturday and you'll reach someone with salt on their hands. Acclimation help, stocking advice, DOA claims — we answer.",
          ],
        ].map(([icon, title, body]) => (
          <div key={title} className="rounded-2xl border border-abyss-700/60 bg-abyss-900 p-6">
            <p className="text-3xl">{icon}</p>
            <h2 className="mt-3 font-semibold text-slate-100">{title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">{body}</p>
          </div>
        ))}
      </div>

      <div className="mt-12 space-y-6 rounded-2xl border border-abyss-700/60 bg-abyss-900 p-8 leading-relaxed text-slate-300">
        <h2 className="text-2xl font-bold text-slate-100">What we care about</h2>
        <p>
          <strong className="text-reef-300">Animal welfare first.</strong> We hold new
          arrivals until they&apos;re eating and stable before they&apos;re ever listed.
          Fish orders can be held up to five business days and corals up to a week, so
          your animals ship on the schedule that&apos;s safest for them — not for us.
        </p>
        <p>
          <strong className="text-reef-300">No mystery livestock.</strong> Care level,
          lighting, flow, placement, and temperament are listed on every product. If a
          species is expert-only, we say so — talking a beginner out of a purchase is a
          better outcome than a loss a week later.
        </p>
        <p>
          <strong className="text-reef-300">The local reef community.</strong> We&apos;re
          Southern California based: local pickup by appointment, tank maintenance
          service, and special-order sourcing for the fish or colony you&apos;ve been
          hunting. Text {info.phone} — weekends included.
        </p>
      </div>

      <div className="mt-12 flex flex-col items-center gap-4 text-center">
        <p className="text-slate-400">Come see what&apos;s swimming today.</p>
        <div className="flex gap-3">
          <Link
            href="/shop"
            className="rounded-full bg-coral-500 px-8 py-3 font-semibold text-white transition hover:bg-coral-600"
          >
            Shop the Reef
          </Link>
          <Link
            href="/learn"
            className="rounded-full border border-reef-500/50 px-8 py-3 font-semibold text-reef-300 transition hover:bg-reef-500 hover:text-abyss-950"
          >
            Learning Center
          </Link>
        </div>
      </div>
    </div>
  );
}
