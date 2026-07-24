import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { promoteToStaff, setUserRole } from "@/lib/staff-actions";

export const metadata = { title: "Staff & Roles — Admin" };

const input =
  "rounded-lg border border-abyss-700 bg-abyss-950 px-3 py-2 text-sm text-slate-200 focus:border-reef-500/60 focus:outline-none";

// What each role can do — shown as a reference so the owner assigns correctly.
const ROLE_CAPABILITIES: [string, string][] = [
  ["OWNER", "Everything, including staff roles & settings (you)"],
  ["ADMIN", "Everything except owner-only staff management"],
  ["INVENTORY_MANAGER", "Products, inventory, bulk edit, CSV import"],
  ["SHIPPING_MANAGER", "Orders, packing queue, shipments, refunds"],
  ["SUPPORT", "Support tickets, orders, customer help"],
  ["MARKETING", "Coupons, gift cards, articles, reviews, email"],
  ["VIEWER", "Read-only admin access"],
  ["CUSTOMER", "Storefront only (no admin)"],
];

const ASSIGNABLE = [
  "ADMIN", "INVENTORY_MANAGER", "SHIPPING_MANAGER",
  "SUPPORT", "MARKETING", "VIEWER", "CUSTOMER",
];

export default async function StaffPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "OWNER") {
    redirect("/admin");
  }
  const { saved, error } = await searchParams;

  const staff = await prisma.user.findMany({
    where: { role: { not: "CUSTOMER" } },
    orderBy: [{ role: "asc" }, { email: "asc" }],
  });

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold">Staff &amp; Roles</h1>
      <p className="mt-1 text-sm text-slate-400">
        Owner-only. Roles gate what each team member can access — changes are audit-logged.
      </p>

      {saved && (
        <p className="mt-4 rounded-lg border border-reef-500/40 bg-reef-500/10 px-4 py-2 text-sm text-reef-300">
          Role updated.
        </p>
      )}
      {error === "notfound" && (
        <p className="mt-4 rounded-lg border border-coral-500/40 bg-coral-500/10 px-4 py-2 text-sm text-coral-300">
          No account with that email — they need to register first.
        </p>
      )}
      {error === "self" && (
        <p className="mt-4 rounded-lg border border-coral-500/40 bg-coral-500/10 px-4 py-2 text-sm text-coral-300">
          You can&apos;t change your own owner role.
        </p>
      )}
      {error === "owner" && (
        <p className="mt-4 rounded-lg border border-coral-500/40 bg-coral-500/10 px-4 py-2 text-sm text-coral-300">
          The owner role can&apos;t be reassigned here.
        </p>
      )}

      {/* Promote by email */}
      <form
        action={promoteToStaff}
        className="mt-6 flex flex-wrap items-end gap-3 rounded-2xl border border-abyss-700/60 bg-abyss-900 p-5"
      >
        <div className="flex-1">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400" htmlFor="st-email">
            Grant staff access (existing account email)
          </label>
          <input id="st-email" name="email" type="email" required placeholder="teammate@email.com"
            className={`${input} w-full`} />
        </div>
        <select name="role" defaultValue="SUPPORT" className={input}>
          {ASSIGNABLE.filter((r) => r !== "CUSTOMER").map((r) => (
            <option key={r} value={r}>{r.replace(/_/g, " ")}</option>
          ))}
        </select>
        <button className="rounded-full bg-coral-500 px-6 py-2 text-sm font-semibold text-white transition hover:bg-coral-600">
          Grant Access
        </button>
      </form>

      {/* Staff list */}
      <div className="mt-6 overflow-x-auto rounded-xl border border-abyss-700/60">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="bg-abyss-900 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3">Member</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3 text-right">Last login</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-abyss-800 bg-abyss-950">
            {staff.map((u) => (
              <tr key={u.id} className="hover:bg-abyss-900">
                <td className="px-4 py-2 text-slate-200">{u.name ?? "—"}</td>
                <td className="px-4 py-2 text-slate-300">{u.email}</td>
                <td className="px-4 py-2">
                  {u.role === "OWNER" || u.id === session.user.id ? (
                    <span className="rounded-full bg-reef-500/20 px-3 py-1 text-xs font-bold text-reef-300">
                      {u.role.replace(/_/g, " ")}{u.id === session.user.id && " (you)"}
                    </span>
                  ) : (
                    <form action={setUserRole} className="flex items-center gap-2">
                      <input type="hidden" name="userId" value={u.id} />
                      <select name="role" defaultValue={u.role} className={input}>
                        {ASSIGNABLE.map((r) => (
                          <option key={r} value={r}>{r.replace(/_/g, " ")}</option>
                        ))}
                      </select>
                      <button className="rounded-lg bg-abyss-700 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-abyss-600">
                        Save
                      </button>
                    </form>
                  )}
                </td>
                <td className="px-4 py-2 text-right text-xs text-slate-400">
                  {u.lastLoginAt ? u.lastLoginAt.toLocaleDateString() : "never"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Role reference */}
      <section className="mt-8 rounded-2xl border border-abyss-700/60 bg-abyss-900 p-5">
        <h2 className="font-semibold text-slate-200">Role permissions</h2>
        <dl className="mt-3 space-y-2 text-sm">
          {ROLE_CAPABILITIES.map(([role, caps]) => (
            <div key={role} className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
              <dt className="w-44 shrink-0 font-mono text-xs font-bold text-reef-300">{role}</dt>
              <dd className="text-slate-400">{caps}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
