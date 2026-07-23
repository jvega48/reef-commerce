import type { Metadata } from "next";
import { getStoreInfoSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Questions about livestock, an order, or local pickup? Get in touch with AquaVida365.",
};

export default async function ContactPage() {
  const info = await getStoreInfoSettings();

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
    </div>
  );
}
