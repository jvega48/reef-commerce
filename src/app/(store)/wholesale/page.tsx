import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { createTicket } from "@/lib/support-actions";

export const metadata: Metadata = {
  title: "Wholesale",
  description:
    "Wholesale coral and saltwater livestock for LFS, maintenance companies, and high-volume reefers. Apply for an AquaVida365 wholesale account.",
  alternates: { canonical: "/wholesale" },
};

const input =
  "w-full rounded-lg border border-abyss-700 bg-abyss-950 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-reef-500/60 focus:outline-none";
const label = "mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400";

export default async function WholesalePage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const [{ sent, error }, session] = await Promise.all([searchParams, auth()]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="text-center">
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-extrabold">
          <span className="text-gradient">Wholesale</span> Program
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-slate-400">
          Stocking a fish store, running a maintenance route, or filling a 500-gallon
          system? Buy the way we do — by the box.
        </p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {[
          ["📦", "Box-lot pricing", "Tiered discounts that scale with volume — corals, fish, and CUC."],
          ["🗓️", "Standing orders", "Weekly or bi-weekly recurring boxes, tuned to what sells for you."],
          ["🤝", "Direct line", "A dedicated contact who knows your systems and your customers."],
        ].map(([icon, title, body]) => (
          <div key={title} className="rounded-2xl border border-abyss-700/60 bg-abyss-900 p-5 text-center">
            <p className="text-3xl">{icon}</p>
            <p className="mt-2 font-semibold text-slate-100">{title}</p>
            <p className="mt-1 text-sm text-slate-400">{body}</p>
          </div>
        ))}
      </div>

      <div className="mx-auto mt-10 max-w-2xl rounded-2xl border border-abyss-700/60 bg-abyss-900 p-6">
        <h2 className="text-lg font-semibold text-slate-100">Apply for a wholesale account</h2>
        {sent ? (
          <div className="mt-4 rounded-xl border border-reef-500/40 bg-reef-500/10 p-6 text-center">
            <p className="text-2xl">🤝</p>
            <p className="mt-2 text-slate-200">Application received!</p>
            <p className="mt-1 text-sm text-slate-400">
              We&apos;ll review and reply within two business days.
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
              <input type="hidden" name="topic" value="WHOLESALE" />
              <input type="text" name="website" tabIndex={-1} autoComplete="off"
                className="hidden" aria-hidden="true" />
              <div>
                <label className={label} htmlFor="wh-name">Contact name *</label>
                <input id="wh-name" name="name" required defaultValue={session?.user?.name ?? ""} className={input} />
              </div>
              <div>
                <label className={label} htmlFor="wh-email">Business email *</label>
                <input id="wh-email" name="email" type="email" required
                  defaultValue={session?.user?.email ?? ""} className={input} />
              </div>
              <div className="sm:col-span-2">
                <label className={label} htmlFor="wh-subject">Business name *</label>
                <input id="wh-subject" name="subject" required maxLength={200}
                  placeholder="Reef City LFS — wholesale application" className={input} />
              </div>
              <div className="sm:col-span-2">
                <label className={label} htmlFor="wh-body">Tell us about your business *</label>
                <textarea id="wh-body" name="body" required rows={5} maxLength={8000}
                  placeholder="Store or service type, location, resale license #, typical weekly volume, what you'd like to stock…"
                  className={input} />
              </div>
              <div className="sm:col-span-2">
                <button className="w-full rounded-full bg-coral-500 py-2.5 text-sm font-semibold text-white transition hover:bg-coral-600">
                  Submit Application
                </button>
              </div>
            </form>
          </>
        )}
      </div>

      <p className="mt-6 text-center text-sm text-slate-400">
        Moving serious volume across a region?{" "}
        <Link href="/distributors" className="text-reef-400 underline">
          Ask about becoming a distributor →
        </Link>
      </p>
    </div>
  );
}
