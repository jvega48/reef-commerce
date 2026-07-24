import type { Metadata } from "next";
import { auth } from "@/auth";
import { getStoreInfoSettings } from "@/lib/settings";
import { createTicket } from "@/lib/support-actions";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Questions about livestock, an order, or local pickup? Get in touch with AquaVida365.",
};

const input =
  "w-full rounded-lg border border-abyss-700 bg-abyss-950 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-reef-500/60 focus:outline-none";
const label = "mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400";

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const [info, { sent, error }, session] = await Promise.all([
    getStoreInfoSettings(),
    searchParams,
    auth(),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold">Contact Us</h1>
      <p className="mt-2 text-slate-400">
        Questions about livestock, an order, local pickup, or tank maintenance —
        we&apos;re happy to help.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-abyss-700/60 bg-abyss-900 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Call or text
          </p>
          <p className="mt-2 text-xl font-bold text-reef-300">
            <a href={`tel:${info.phone.replace(/\D/g, "")}`} className="hover:text-reef-200">
              {info.phone}
            </a>
          </p>
          <p className="mt-2 text-sm text-slate-400">
            {info.hoursWeekday}
            <br />
            {info.hoursWeekend}
          </p>
        </div>
        <div className="rounded-2xl border border-abyss-700/60 bg-abyss-900 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Follow the drops
          </p>
          <ul className="mt-2 space-y-2 text-sm">
            <li>
              <a
                href={`https://instagram.com/${info.instagram}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-reef-400 hover:text-reef-300"
              >
                Instagram @{info.instagram}
              </a>
            </li>
            <li>
              <a
                href={`https://tiktok.com/@${info.tiktok}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-reef-400 hover:text-reef-300"
              >
                TikTok @{info.tiktok}
              </a>
            </li>
            {info.supportEmail && (
              <li>
                <a
                  href={`mailto:${info.supportEmail}`}
                  className="text-reef-400 hover:text-reef-300"
                >
                  {info.supportEmail}
                </a>
              </li>
            )}
          </ul>
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-abyss-700/60 bg-abyss-900 p-5 text-sm leading-relaxed text-slate-300">
        <h2 className="mb-2 text-lg font-semibold text-slate-100">
          Local services & special requests
        </h2>
        <p>
          We offer local tank maintenance and take special livestock requests —
          text us to schedule a weekend appointment or ask about something you
          don&apos;t see in the shop.
        </p>
      </div>

      {/* Message form → support ticket */}
      <div className="mt-8 rounded-2xl border border-abyss-700/60 bg-abyss-900 p-5">
        <h2 className="text-lg font-semibold text-slate-100">Send us a message</h2>
        {sent ? (
          <div className="mt-4 rounded-xl border border-reef-500/40 bg-reef-500/10 p-5 text-center">
            <p className="text-2xl">📬</p>
            <p className="mt-2 text-slate-200">
              Got it! We typically reply within one business day.
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Replies go to your email{session?.user ? " and your account's Support page" : ""}.
            </p>
          </div>
        ) : (
          <>
            {error === "missing" && (
              <p className="mt-3 rounded-lg border border-coral-500/40 bg-coral-500/10 px-4 py-2 text-sm text-coral-300">
                Please fill in every required field.
              </p>
            )}
            {error === "ratelimit" && (
              <p className="mt-3 rounded-lg border border-coral-500/40 bg-coral-500/10 px-4 py-2 text-sm text-coral-300">
                Too many messages in the last hour — please wait a bit and try again.
              </p>
            )}
            <form action={createTicket} className="mt-4 grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="fromContact" value="1" />
              {/* Honeypot — hidden from humans, catnip for bots */}
              <input
                type="text" name="website" tabIndex={-1} autoComplete="off"
                className="hidden" aria-hidden="true"
              />
              <div>
                <label className={label} htmlFor="ct-name">Name *</label>
                <input id="ct-name" name="name" required
                  defaultValue={session?.user?.name ?? ""} className={input} />
              </div>
              <div>
                <label className={label} htmlFor="ct-email">Email *</label>
                <input id="ct-email" name="email" type="email" required
                  defaultValue={session?.user?.email ?? ""} className={input} />
              </div>
              <div className="sm:col-span-2">
                <label className={label} htmlFor="ct-topic">Topic</label>
                <select id="ct-topic" name="topic" className={input}>
                  <option value="PRODUCT_QUESTION">Product question</option>
                  <option value="ORDER_ISSUE">Order issue</option>
                  <option value="SHIPPING">Shipping question</option>
                  <option value="WHOLESALE">Wholesale inquiry</option>
                  <option value="DISTRIBUTOR">Become a distributor</option>
                  <option value="OTHER">Something else</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className={label} htmlFor="ct-subject">Subject *</label>
                <input id="ct-subject" name="subject" required maxLength={200} className={input} />
              </div>
              <div className="sm:col-span-2">
                <label className={label} htmlFor="ct-body">Message *</label>
                <textarea id="ct-body" name="body" required rows={5} maxLength={8000} className={input} />
              </div>
              <div className="sm:col-span-2">
                <button className="rounded-full bg-coral-500 px-8 py-2.5 text-sm font-semibold text-white transition hover:bg-coral-600">
                  Send Message
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
