import { redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  getGuaranteeSettings,
  getShippingSettings,
  getStoreInfoSettings,
  getTaxSettings,
} from "@/lib/settings";
import { saveSettings } from "@/lib/settings-actions";

export const metadata = { title: "Settings — Admin" };

const input =
  "w-full rounded-lg border border-abyss-700 bg-abyss-950 px-3 py-2 text-sm text-slate-200 focus:border-reef-500/60 focus:outline-none";
const label = "mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400";
const section = "rounded-2xl border border-abyss-700/60 bg-abyss-900 p-5";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const session = await auth();
  if (!session?.user || !["OWNER", "ADMIN"].includes(session.user.role)) {
    redirect("/admin");
  }

  const [shipping, storeInfo, guarantee, tax, { saved, error }] = await Promise.all([
    getShippingSettings(),
    getStoreInfoSettings(),
    getGuaranteeSettings(),
    getTaxSettings(),
    searchParams,
  ]);

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold">Store Settings</h1>
      <p className="mt-1 text-sm text-slate-400">
        These values drive checkout, shipping, and the policy pages. Changes take
        effect immediately storewide.
      </p>

      {saved && (
        <p className="mt-4 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300">
          Settings saved.
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-lg border border-coral-500/40 bg-coral-500/10 px-4 py-2 text-sm text-coral-300">
          Some values were invalid — nothing was saved. Check the numbers and try again.
        </p>
      )}

      <form action={saveSettings} className="mt-6 space-y-6">
        <section className={section}>
          <h2 className="mb-4 font-semibold text-slate-200">Shipping</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className={label}>Free shipping over ($)</label>
              <input name="freeShippingThreshold" type="number" step="0.01" min="0" defaultValue={shipping.freeShippingThreshold} className={input} />
            </div>
            <div>
              <label className={label}>Overnight rate ($)</label>
              <input name="overnightRate" type="number" step="0.01" min="0" defaultValue={shipping.overnightRate} className={input} />
            </div>
            <div>
              <label className={label}>In-state rate ($)</label>
              <input name="inStateRate" type="number" step="0.01" min="0" defaultValue={shipping.inStateRate} className={input} />
            </div>
            <div>
              <label className={label}>Home state</label>
              <input name="homeState" maxLength={2} defaultValue={shipping.homeState} className={input} />
            </div>
            <div>
              <label className={label}>Max box weight (lbs)</label>
              <input name="maxBoxWeightLbs" type="number" min="1" defaultValue={shipping.maxBoxWeightLbs} className={input} />
            </div>
            <div className="flex items-end pb-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
                <input type="checkbox" name="localPickupEnabled" defaultChecked={shipping.localPickupEnabled} className="accent-[#14b5c8]" />
                Local pickup enabled
              </label>
            </div>
            <div className="md:col-span-3">
              <label className={label}>Shipping method label</label>
              <input name="overnightLabel" defaultValue={shipping.overnightLabel} className={input} />
            </div>
            <div className="md:col-span-3">
              <label className={label}>Shipping method description</label>
              <input name="overnightDescription" defaultValue={shipping.overnightDescription} className={input} />
            </div>
            <div className="md:col-span-3">
              <label className={label}>Ship days note</label>
              <input name="shipDaysNote" defaultValue={shipping.shipDaysNote} className={input} />
            </div>
            <div className="md:col-span-3">
              <label className={label}>Shipping restrictions note</label>
              <input name="allowedStatesNote" defaultValue={shipping.allowedStatesNote} className={input} />
            </div>
          </div>
        </section>

        <section className={section}>
          <h2 className="mb-4 font-semibold text-slate-200">Live Arrival Guarantee</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className={label}>Guarantee length (days)</label>
              <input name="guaranteeDays" type="number" min="0" defaultValue={guarantee.guaranteeDays} className={input} />
            </div>
            <div>
              <label className={label}>Report issues within (days)</label>
              <input name="reportWindowDays" type="number" min="0" defaultValue={guarantee.reportWindowDays} className={input} />
            </div>
            <div>
              <label className={label}>DOA video window (hours)</label>
              <input name="doaVideoWindowHours" type="number" min="0" defaultValue={guarantee.doaVideoWindowHours} className={input} />
            </div>
            <div>
              <label className={label}>High-value video over ($)</label>
              <input name="highValueVideoThreshold" type="number" min="0" defaultValue={guarantee.highValueVideoThreshold} className={input} />
            </div>
            <div>
              <label className={label}>Cancellation fee (%)</label>
              <input name="cancellationFeePct" type="number" min="0" max="100" defaultValue={guarantee.cancellationFeePct} className={input} />
            </div>
            <div>
              <label className={label}>Coral hold limit (days)</label>
              <input name="coralHoldDays" type="number" min="0" defaultValue={guarantee.coralHoldDays} className={input} />
            </div>
            <div>
              <label className={label}>Fish hold limit (business days)</label>
              <input name="fishHoldBusinessDays" type="number" min="0" defaultValue={guarantee.fishHoldBusinessDays} className={input} />
            </div>
          </div>
        </section>

        <section className={section}>
          <h2 className="mb-1 font-semibold text-slate-200">Sales Tax</h2>
          <p className="mb-4 text-xs text-slate-500">
            Off by default — livestock is untaxed in many states. Turn on when you have
            nexus and a rate to collect.
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-end pb-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
                <input type="checkbox" name="taxEnabled" defaultChecked={tax.enabled} className="accent-[#14b5c8]" />
                Collect sales tax
              </label>
            </div>
            <div>
              <label className={label}>Rate (%)</label>
              <input name="taxRatePct" type="number" step="0.001" min="0" max="30" defaultValue={tax.ratePct} className={input} />
            </div>
            <div>
              <label className={label}>Line-item label</label>
              <input name="taxLabel" defaultValue={tax.label} className={input} />
            </div>
            <div className="flex items-end pb-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
                <input type="checkbox" name="taxHomeStateOnly" defaultChecked={tax.homeStateOnly} className="accent-[#14b5c8]" />
                Home state only (nexus)
              </label>
            </div>
            <div className="flex items-end pb-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
                <input type="checkbox" name="taxShipping" defaultChecked={tax.taxShipping} className="accent-[#14b5c8]" />
                Tax shipping too
              </label>
            </div>
          </div>
        </section>

        <section className={section}>
          <h2 className="mb-4 font-semibold text-slate-200">Store Info</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className={label}>Phone</label>
              <input name="phone" defaultValue={storeInfo.phone} className={input} />
            </div>
            <div>
              <label className={label}>Support email</label>
              <input name="supportEmail" type="email" defaultValue={storeInfo.supportEmail} className={input} />
            </div>
            <div>
              <label className={label}>Weekday hours</label>
              <input name="hoursWeekday" defaultValue={storeInfo.hoursWeekday} className={input} />
            </div>
            <div>
              <label className={label}>Weekend hours</label>
              <input name="hoursWeekend" defaultValue={storeInfo.hoursWeekend} className={input} />
            </div>
            <div>
              <label className={label}>Instagram handle</label>
              <input name="instagram" defaultValue={storeInfo.instagram} className={input} />
            </div>
            <div>
              <label className={label}>TikTok handle</label>
              <input name="tiktok" defaultValue={storeInfo.tiktok} className={input} />
            </div>
          </div>
        </section>

        <button
          type="submit"
          className="rounded-full bg-coral-500 px-8 py-3 text-sm font-semibold text-white transition hover:bg-coral-600"
        >
          Save Settings
        </button>
      </form>
    </div>
  );
}
