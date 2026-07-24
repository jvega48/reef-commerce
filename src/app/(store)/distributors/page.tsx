import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { createTicket } from "@/lib/support-actions";

export const metadata: Metadata = {
  title: "Become a Distributor",
  description:
    "Distribute AquaVida365 livestock in your region — aquaculture partnerships, brood stock, and regional distribution.",
  alternates: { canonical: "/distributors" },
};

const input =
  "w-full rounded-lg border border-abyss-700 bg-abyss-950 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-reef-500/60 focus:outline-none";
const label = "mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400";

export default async function DistributorsPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const [{ sent, error }, session] = await Promise.all([searchParams, auth()]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="text-center">
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-extrabold">
          Become a <span className="text-gradient">Distributor</span>
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-slate-400">
          We partner with a small number of regional distributors to carry AquaVida365
          aquacultured lines beyond Southern California.
        </p>
      </div>

      <div className="mx-auto mt-10 max-w-2xl space-y-4 rounded-2xl border border-abyss-700/60 bg-abyss-900 p-6 text-sm leading-relaxed text-slate-300">
        <h2 className="text-lg font-semibold text-slate-100">What a partnership looks like</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li><strong>Aquacultured lines:</strong> named AquaVida365 zoa, blasto, and euphyllia strains with mother-colony provenance.</li>
          <li><strong>Regional exclusivity</strong> for qualified partners with established retail networks.</li>
          <li><strong>Brood stock programs:</strong> we supply mother colonies and grow-out guidance; you propagate locally.</li>
          <li><strong>Requirements:</strong> commercial facility, business license, livestock experience, and cold-chain logistics capability.</li>
        </ul>
      </div>

      <div className="mx-auto mt-8 max-w-2xl rounded-2xl border border-abyss-700/60 bg-abyss-900 p-6">
        <h2 className="text-lg font-semibold text-slate-100">Distributor inquiry</h2>
        {sent ? (
          <div className="mt-4 rounded-xl border border-reef-500/40 bg-reef-500/10 p-6 text-center">
            <p className="text-2xl">🌊</p>
            <p className="mt-2 text-slate-200">Inquiry received!</p>
            <p className="mt-1 text-sm text-slate-400">
              Distribution conversations are handled personally — expect a reply within a week.
            </p>
          </div>
        ) : (
          <>
            {error === "missing" && (
              <p className="mt-3 rounded-lg border border-coral-500/40 bg-coral-500/10 px-4 py-2 text-sm text-coral-300">
                Please fill in every required field.
              </p>
            )}
            <form action={createTicket} className="mt-4 grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="fromContact" value="1" />
              <input type="hidden" name="topic" value="DISTRIBUTOR" />
              <input type="text" name="website" tabIndex={-1} autoComplete="off"
                className="hidden" aria-hidden="true" />
              <div>
                <label className={label} htmlFor="ds-name">Contact name *</label>
                <input id="ds-name" name="name" required defaultValue={session?.user?.name ?? ""} className={input} />
              </div>
              <div>
                <label className={label} htmlFor="ds-email">Business email *</label>
                <input id="ds-email" name="email" type="email" required
                  defaultValue={session?.user?.email ?? ""} className={input} />
              </div>
              <div className="sm:col-span-2">
                <label className={label} htmlFor="ds-subject">Company &amp; region *</label>
                <input id="ds-subject" name="subject" required maxLength={200}
                  placeholder="Gulf Coast Corals — TX/LA distribution" className={input} />
              </div>
              <div className="sm:col-span-2">
                <label className={label} htmlFor="ds-body">Facility &amp; distribution details *</label>
                <textarea id="ds-body" name="body" required rows={5} maxLength={8000}
                  placeholder="Facility size and systems, current brands carried, retail network, logistics setup…"
                  className={input} />
              </div>
              <div className="sm:col-span-2">
                <button className="w-full rounded-full bg-coral-500 py-2.5 text-sm font-semibold text-white transition hover:bg-coral-600">
                  Send Inquiry
                </button>
              </div>
            </form>
          </>
        )}
      </div>

      <p className="mt-6 text-center text-sm text-slate-400">
        Just need better pricing for a store?{" "}
        <Link href="/wholesale" className="text-reef-400 underline">
          The wholesale program is the faster path →
        </Link>
      </p>
    </div>
  );
}
