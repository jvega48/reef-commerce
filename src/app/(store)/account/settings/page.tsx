import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  changePassword,
  updateNotificationPrefs,
  updateProfile,
} from "@/lib/account-actions";

export const metadata = { title: "Account Settings" };

const input =
  "w-full rounded-lg border border-abyss-700 bg-abyss-950 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-reef-500/60 focus:outline-none";
const label = "mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { saved, error } = await searchParams;

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) redirect("/login");

  const banner = (kind: "ok" | "err", msg: string) => (
    <p
      role="status"
      className={`mb-4 rounded-lg border px-4 py-2 text-sm ${
        kind === "ok"
          ? "border-reef-500/40 bg-reef-500/10 text-reef-300"
          : "border-coral-500/40 bg-coral-500/10 text-coral-300"
      }`}
    >
      {msg}
    </p>
  );

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold">Account Settings</h1>

      {saved === "profile" && banner("ok", "Profile updated.")}
      {saved === "notifications" && banner("ok", "Notification preferences saved.")}
      {saved === "password" && banner("ok", "Password changed.")}
      {error === "wrongpass" && banner("err", "Current password is incorrect.")}
      {error === "weak" && banner("err", "New password must be at least 8 characters.")}

      {/* Profile */}
      <section className="mt-6 rounded-2xl border border-abyss-700/60 bg-abyss-900 p-5">
        <h2 className="font-semibold text-slate-200">Profile</h2>
        <form action={updateProfile} className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor="pf-name">Name</label>
            <input id="pf-name" name="name" defaultValue={user.name ?? ""} className={input} />
          </div>
          <div>
            <label className={label} htmlFor="pf-phone">Phone</label>
            <input id="pf-phone" name="phone" type="tel" defaultValue={user.phone ?? ""} className={input} />
          </div>
          <div className="sm:col-span-2">
            <label className={label}>Email</label>
            <input value={user.email} disabled className={`${input} opacity-60`} />
            <p className="mt-1 text-xs text-slate-500">
              Email changes require contacting support (it&apos;s your login and order key).
            </p>
          </div>
          <div className="sm:col-span-2">
            <button className="rounded-full bg-reef-500 px-6 py-2.5 text-sm font-semibold text-abyss-950 transition hover:bg-reef-400">
              Save Profile
            </button>
          </div>
        </form>
      </section>

      {/* Notifications */}
      <section className="mt-6 rounded-2xl border border-abyss-700/60 bg-abyss-900 p-5">
        <h2 className="font-semibold text-slate-200">Email Notifications</h2>
        <form action={updateNotificationPrefs} className="mt-4 space-y-3 text-sm">
          {(
            [
              ["notifyOrderUpdates", "Order updates", "Shipping confirmations, tracking, delivery", user.notifyOrderUpdates],
              ["notifyRestock", "Restock alerts", "When a wishlist / alert item comes back in stock", user.notifyRestock],
              ["marketingOptIn", "The Coral Drop", "Weekly WYSIWYG drops, rare fish, subscriber deals", user.marketingOptIn],
            ] as const
          ).map(([name, title, desc, checked]) => (
            <label
              key={name}
              className="flex cursor-pointer items-start gap-3 rounded-xl border border-abyss-700 bg-abyss-950 p-4"
            >
              <input
                type="checkbox"
                name={name}
                defaultChecked={checked}
                className="mt-0.5 h-4 w-4 accent-[#14b5c8]"
              />
              <span>
                <span className="font-semibold text-slate-200">{title}</span>
                <br />
                <span className="text-xs text-slate-400">{desc}</span>
              </span>
            </label>
          ))}
          <button className="rounded-full bg-reef-500 px-6 py-2.5 text-sm font-semibold text-abyss-950 transition hover:bg-reef-400">
            Save Preferences
          </button>
        </form>
      </section>

      {/* Security */}
      <section className="mt-6 rounded-2xl border border-abyss-700/60 bg-abyss-900 p-5">
        <h2 className="font-semibold text-slate-200">Security</h2>
        <form action={changePassword} className="mt-4 grid gap-3">
          <div>
            <label className={label} htmlFor="sec-current">Current password</label>
            <input id="sec-current" name="currentPassword" type="password" required
              autoComplete="current-password" className={input} />
          </div>
          <div>
            <label className={label} htmlFor="sec-new">New password (8+ characters)</label>
            <input id="sec-new" name="newPassword" type="password" required minLength={8}
              autoComplete="new-password" className={input} />
          </div>
          <div>
            <button className="rounded-full bg-coral-500 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-coral-600">
              Change Password
            </button>
          </div>
        </form>
        <p className="mt-3 text-xs text-slate-500">
          Changing your password signs out other devices within an hour (session refresh).
          Forgot it? Sign out and use “Forgot password” on the login page.
        </p>
      </section>
    </div>
  );
}
