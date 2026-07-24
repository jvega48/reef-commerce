import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How AquaVida365 collects, uses, and protects your information.",
  alternates: { canonical: "/privacy" },
};

// NOTE FOR OWNER: the live Shopify site's privacy page was empty, so this is a
// new draft written for this platform's actual data practices. Have it
// reviewed before launch — privacy text is a legal document.

const UPDATED = "July 23, 2026";

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-[family-name:var(--font-display)] text-4xl font-extrabold">
        Privacy <span className="text-gradient">Policy</span>
      </h1>
      <p className="mt-2 text-sm text-slate-500">Last updated: {UPDATED}</p>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-slate-300">
        <section>
          <h2 className="text-lg font-bold text-slate-100">What we collect</h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-5">
            <li><strong>Account details</strong> — name, email, phone, and password (stored as a salted hash; we can never read it).</li>
            <li><strong>Order information</strong> — items purchased, shipping addresses, order history.</li>
            <li><strong>Payment</strong> — processed entirely by Stripe. Card numbers never touch our servers.</li>
            <li><strong>Support conversations</strong> — tickets and messages you send us.</li>
            <li><strong>Site activity</strong> — cart contents and recently-viewed products (stored in cookies on your device), and standard server logs.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-100">How we use it</h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-5">
            <li>Fulfilling and shipping your orders, including sharing your address with shipping carriers.</li>
            <li>Transactional email: order confirmations, tracking, refunds, password resets, support replies.</li>
            <li>Marketing email (the &ldquo;Coral Drop&rdquo;) <strong>only if you opt in</strong> — unsubscribe anytime from any email or your account settings.</li>
            <li>Reef Points, referrals, and other account features you use.</li>
            <li>Fraud prevention and legal compliance.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-100">What we never do</h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-5">
            <li>Sell or rent your personal information. Ever.</li>
            <li>Share your data with third parties beyond the processors needed to run the store (payments, shipping, email delivery, hosting).</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-100">Cookies</h2>
          <p className="mt-2">
            We use first-party cookies only: your session (signed in state), your cart, and
            your recently-viewed products. No third-party ad trackers.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-100">Your rights</h2>
          <p className="mt-2">
            You can view and update your information anytime in{" "}
            <Link href="/account/settings" className="text-reef-400 underline">account settings</Link>.
            To request a copy or deletion of your data (California residents: CCPA rights),
            open a <Link href="/account/support" className="text-reef-400 underline">support ticket</Link>{" "}
            or use the <Link href="/contact" className="text-reef-400 underline">contact form</Link> —
            we&apos;ll respond within 30 days. Order records required for tax and accounting
            are retained as the law requires.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-100">Security</h2>
          <p className="mt-2">
            Traffic is encrypted with TLS, passwords are hashed with bcrypt, payment data is
            handled by Stripe (PCI-DSS Level 1), and staff access to customer data is
            role-restricted and audit-logged.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-100">Contact</h2>
          <p className="mt-2">
            Privacy questions? Reach us through the{" "}
            <Link href="/contact" className="text-reef-400 underline">contact page</Link>.
          </p>
        </section>
      </div>
    </div>
  );
}
