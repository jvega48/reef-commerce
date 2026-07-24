import { prisma } from "@/lib/prisma";
import { createCoupon, deleteCoupon, toggleCoupon } from "@/lib/coupon-actions";
import { formatPrice } from "@/components/ProductCard";

export const metadata = { title: "Coupons — Admin" };

const input =
  "w-full rounded-lg border border-abyss-700 bg-abyss-950 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-reef-500/60 focus:outline-none";
const label = "mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400";

export default async function AdminCouponsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ error }, coupons] = await Promise.all([
    searchParams,
    prisma.coupon.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { orders: true } } },
    }),
  ]);

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-bold">Coupons</h1>
      <p className="mt-1 text-sm text-slate-400">
        Customers enter these at checkout. Free-shipping codes zero the shipping line;
        percent/fixed codes discount the subtotal.
      </p>

      {error === "invalid" && (
        <p className="mt-4 rounded-lg border border-coral-500/40 bg-coral-500/10 px-4 py-2 text-sm text-coral-300">
          Check the code and value — percent codes need 1–100, fixed codes need an amount.
        </p>
      )}
      {error === "exists" && (
        <p className="mt-4 rounded-lg border border-coral-500/40 bg-coral-500/10 px-4 py-2 text-sm text-coral-300">
          That code already exists.
        </p>
      )}

      {/* Create */}
      <form
        action={createCoupon}
        className="mt-6 grid gap-3 rounded-2xl border border-abyss-700/60 bg-abyss-900 p-5 sm:grid-cols-2 lg:grid-cols-4"
      >
        <div>
          <label className={label} htmlFor="cp-code">Code *</label>
          <input id="cp-code" name="code" required placeholder="REEF10" className={input} />
        </div>
        <div>
          <label className={label} htmlFor="cp-type">Type</label>
          <select id="cp-type" name="type" className={input}>
            <option value="PERCENT">% off subtotal</option>
            <option value="FIXED">$ off subtotal</option>
            <option value="FREE_SHIPPING">Free shipping</option>
          </select>
        </div>
        <div>
          <label className={label} htmlFor="cp-value">Value (% or $)</label>
          <input id="cp-value" name="value" type="number" step="0.01" min={0} placeholder="10" className={input} />
        </div>
        <div>
          <label className={label} htmlFor="cp-min">Min subtotal ($)</label>
          <input id="cp-min" name="minSubtotal" type="number" step="0.01" min={0} className={input} />
        </div>
        <div>
          <label className={label} htmlFor="cp-max">Max uses</label>
          <input id="cp-max" name="maxUses" type="number" min={1} placeholder="∞" className={input} />
        </div>
        <div>
          <label className={label} htmlFor="cp-start">Starts</label>
          <input id="cp-start" name="startsAt" type="date" className={input} />
        </div>
        <div>
          <label className={label} htmlFor="cp-end">Expires (end of day)</label>
          <input id="cp-end" name="expiresAt" type="date" className={input} />
        </div>
        <div className="flex items-end">
          <button className="w-full rounded-full bg-coral-500 py-2.5 text-sm font-semibold text-white transition hover:bg-coral-600">
            Create Coupon
          </button>
        </div>
      </form>

      {/* List */}
      {coupons.length === 0 ? (
        <p className="mt-6 text-slate-400">No coupons yet.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-abyss-700/60">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-abyss-900 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Discount</th>
                <th className="px-4 py-3">Rules</th>
                <th className="px-4 py-3 text-right">Used</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-abyss-800 bg-abyss-950">
              {coupons.map((c) => {
                const expired = c.expiresAt && c.expiresAt < new Date();
                return (
                  <tr key={c.id} className="hover:bg-abyss-900">
                    <td className="px-4 py-2 font-mono font-bold text-reef-300">{c.code}</td>
                    <td className="px-4 py-2 text-slate-300">
                      {c.type === "PERCENT" && `${Number(c.value)}% off`}
                      {c.type === "FIXED" && `${formatPrice(c.value)} off`}
                      {c.type === "FREE_SHIPPING" && "Free shipping"}
                    </td>
                    <td className="px-4 py-2 text-xs text-slate-400">
                      {c.minSubtotal != null && `min ${formatPrice(c.minSubtotal)} · `}
                      {c.maxUses != null && `max ${c.maxUses} uses · `}
                      {c.startsAt && `from ${c.startsAt.toLocaleDateString()} · `}
                      {c.expiresAt ? `until ${c.expiresAt.toLocaleDateString()}` : "no expiry"}
                    </td>
                    <td className="px-4 py-2 text-right text-slate-300">
                      {c.usedCount}
                      <span className="text-xs text-slate-500"> ({c._count.orders} orders)</span>
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                          !c.active
                            ? "bg-slate-500/20 text-slate-300"
                            : expired
                              ? "bg-amber-500/20 text-amber-300"
                              : "bg-emerald-500/20 text-emerald-300"
                        }`}
                      >
                        {!c.active ? "OFF" : expired ? "EXPIRED" : "ACTIVE"}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex justify-end gap-3 text-xs">
                        <form action={toggleCoupon}>
                          <input type="hidden" name="couponId" value={c.id} />
                          <button className="text-slate-400 hover:text-reef-300">
                            {c.active ? "Disable" : "Enable"}
                          </button>
                        </form>
                        <form action={deleteCoupon}>
                          <input type="hidden" name="couponId" value={c.id} />
                          <button className="text-slate-400 hover:text-coral-300">Delete</button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
