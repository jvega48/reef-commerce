import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms of service for shopping with AquaVida365.",
  alternates: { canonical: "/terms" },
};

// NOTE FOR OWNER: the live Shopify site's terms page was empty, so this is a
// new draft. Have it reviewed by counsel before launch.

const UPDATED = "July 23, 2026";

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-[family-name:var(--font-display)] text-4xl font-extrabold">
        Terms of <span className="text-gradient">Service</span>
      </h1>
      <p className="mt-2 text-sm text-slate-500">Last updated: {UPDATED}</p>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-slate-300">
        <section>
          <h2 className="text-lg font-bold text-slate-100">1. The basics</h2>
          <p className="mt-2">
            By placing an order with AquaVida365 (&ldquo;we&rdquo;, &ldquo;us&rdquo;), you
            agree to these terms, our{" "}
            <Link href="/shipping" className="text-reef-400 underline">shipping policy</Link>,{" "}
            <Link href="/guarantee" className="text-reef-400 underline">live-arrival guarantee</Link>,{" "}
            <Link href="/returns" className="text-reef-400 underline">returns policy</Link>, and{" "}
            <Link href="/privacy" className="text-reef-400 underline">privacy policy</Link>.
            Those policy pages are part of these terms.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-100">2. Live animals</h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-5">
            <li>You confirm you have (or will have at delivery) an appropriate, cycled aquarium for the species ordered.</li>
            <li>Someone must be present to receive live shipments on the delivery date.</li>
            <li>Guarantee claims require the documentation and timing described in the guarantee — no exceptions, because carriers require the same from us.</li>
            <li>It&apos;s your responsibility to confirm a species is legal to keep in your state before ordering.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-100">3. Orders, pricing & availability</h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-5">
            <li>All prices are USD. We may correct obvious pricing errors and cancel affected orders with a full refund.</li>
            <li>WYSIWYG listings are single specimens — in the rare event of a double-sell or a health decline before shipping, we&apos;ll offer a comparable replacement, store credit, or full refund.</li>
            <li>Cancellations follow the <Link href="/returns" className="text-reef-400 underline">returns policy</Link> (store credit in full, or refund minus restocking fee).</li>
            <li>A pending unpaid balance blocks all shipments.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-100">4. Accounts, points & gift cards</h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-5">
            <li>You&apos;re responsible for your account credentials; notify us of any unauthorized use.</li>
            <li>Reef Points have no cash value, aren&apos;t transferable, and may be adjusted for returns, fraud, or program changes.</li>
            <li>Gift cards never expire, aren&apos;t redeemable for cash except where required by law, and can&apos;t be replaced if the code is shared.</li>
            <li>One account per customer for referral rewards; self-referrals and abuse void the associated points.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-100">5. Content</h2>
          <p className="mt-2">
            Reviews you submit may be displayed with your first name. Don&apos;t post
            anything unlawful, misleading, or abusive — we moderate all reviews and may
            decline or remove any content. Site content (photos, guides, product copy) is
            ours; don&apos;t reuse it commercially without permission.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-100">6. Liability</h2>
          <p className="mt-2">
            Our total liability for any order is limited to the amount you paid for that
            order. We&apos;re not liable for indirect or consequential damages (including
            other livestock losses in your aquarium), carrier delays, weather events, or
            force majeure. Nothing in these terms limits rights that consumer law
            doesn&apos;t allow us to limit.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-100">7. Disputes & changes</h2>
          <p className="mt-2">
            These terms are governed by California law. Talk to us first — nearly every
            issue is resolved through{" "}
            <Link href="/account/support" className="text-reef-400 underline">support</Link>.
            We may update these terms; the &ldquo;last updated&rdquo; date changes when we
            do, and continued use after changes means acceptance.
          </p>
        </section>
      </div>
    </div>
  );
}
