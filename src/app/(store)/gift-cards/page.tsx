import type { Metadata } from "next";
import { auth } from "@/auth";
import { purchaseGiftCard } from "@/lib/giftcard-actions";

export const metadata: Metadata = {
  title: "Gift Cards",
  description:
    "AquaVida365 digital gift cards — delivered by email, never expire. The perfect gift for any reef keeper.",
  alternates: { canonical: "/gift-cards" },
};

const input =
  "w-full rounded-lg border border-abyss-700 bg-abyss-950 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-reef-500/60 focus:outline-none";
const label = "mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400";

const AMOUNTS = [25, 50, 100, 200];

export default async function GiftCardsPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; cancelled?: string; error?: string }>;
}) {
  const [{ sent, cancelled, error }, session] = await Promise.all([
    searchParams,
    auth(),
  ]);
  const stripeEnabled = Boolean(process.env.STRIPE_SECRET_KEY);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="text-center">
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-extrabold">
          Give the <span className="text-gradient">Reef</span> 🎁
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-slate-400">
          Digital gift cards delivered by email — redeemable on every coral, fish, and
          invert in the shop. They never expire and never lose value.
        </p>
      </div>

      {sent && (
        <div className="mx-auto mt-8 max-w-xl rounded-2xl border border-reef-500/40 bg-reef-500/10 p-6 text-center">
          <p className="text-3xl">🪸</p>
          <p className="mt-2 font-semibold text-slate-200">Gift card on the way!</p>
          <p className="mt-1 text-sm text-slate-400">
            {stripeEnabled
              ? "As soon as payment completes, the code is emailed to the recipient."
              : "The code has been emailed to the recipient (test mode)."}
          </p>
        </div>
      )}
      {cancelled && (
        <p className="mx-auto mt-8 max-w-xl rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-center text-sm text-amber-300">
          Payment cancelled — no gift card was purchased.
        </p>
      )}
      {error && (
        <p className="mx-auto mt-8 max-w-xl rounded-lg border border-coral-500/40 bg-coral-500/10 px-4 py-2 text-center text-sm text-coral-300">
          Please choose a valid amount ($10–$500) and enter your email.
        </p>
      )}

      {!sent && (
        <div className="mx-auto mt-10 max-w-xl rounded-2xl border border-abyss-700/60 bg-abyss-900 p-6">
          <form action={purchaseGiftCard} className="space-y-4">
            <fieldset>
              <legend className={label}>Amount</legend>
              <div className="grid grid-cols-4 gap-2">
                {AMOUNTS.map((a, i) => (
                  <label key={a} className="cursor-pointer">
                    <input
                      type="radio"
                      name="amount"
                      value={a}
                      defaultChecked={i === 1}
                      className="peer sr-only"
                    />
                    <span className="flex items-center justify-center rounded-xl border border-abyss-700 py-3 font-bold text-slate-300 transition peer-checked:border-reef-500 peer-checked:bg-reef-500/10 peer-checked:text-reef-300">
                      ${a}
                    </span>
                  </label>
                ))}
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Custom amount? Enter it here instead ($10–$500):
              </p>
              <input
                type="number"
                name="amount"
                min={10}
                max={500}
                step={5}
                placeholder="Custom amount (overrides selection)"
                className={`${input} mt-1`}
              />
            </fieldset>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={label} htmlFor="gc-buyer">Your email *</label>
                <input id="gc-buyer" name="buyerEmail" type="email" required
                  defaultValue={session?.user?.email ?? ""} className={input} />
              </div>
              <div>
                <label className={label} htmlFor="gc-recipient">Recipient email</label>
                <input id="gc-recipient" name="recipientEmail" type="email"
                  placeholder="Blank = send to you" className={input} />
              </div>
            </div>
            <div>
              <label className={label} htmlFor="gc-name">Recipient name</label>
              <input id="gc-name" name="recipientName" className={input} />
            </div>
            <div>
              <label className={label} htmlFor="gc-message">Gift message</label>
              <textarea id="gc-message" name="message" rows={3} maxLength={500}
                placeholder="Happy birthday! Go pick a coral…" className={input} />
            </div>
            <button className="w-full rounded-full bg-coral-500 py-3 font-semibold text-white shadow-lg shadow-coral-500/25 transition hover:bg-coral-600">
              {stripeEnabled ? "Buy Gift Card" : "Buy Gift Card (Test Mode)"}
            </button>
            <p className="text-center text-xs text-slate-500">
              Codes look like AV365-XXXX-XXXX-XXXX and are entered at checkout.
              Balance carries over — spend it across as many orders as you like.
            </p>
          </form>
        </div>
      )}
    </div>
  );
}
