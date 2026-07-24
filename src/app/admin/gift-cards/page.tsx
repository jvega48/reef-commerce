import { prisma } from "@/lib/prisma";
import { issueCompGiftCard, toggleGiftCard } from "@/lib/coupon-actions";
import { formatPrice } from "@/components/ProductCard";

export const metadata = { title: "Gift Cards — Admin" };

const input =
  "w-full rounded-lg border border-abyss-700 bg-abyss-950 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-reef-500/60 focus:outline-none";
const label = "mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400";

export default async function AdminGiftCardsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ error }, cards, stats] = await Promise.all([
    searchParams,
    prisma.giftCard.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        purchasedBy: { select: { email: true } },
        _count: { select: { ordersRedeemed: true } },
      },
    }),
    prisma.giftCard.aggregate({
      where: { active: true },
      _sum: { balance: true },
      _count: true,
    }),
  ]);

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-bold">Gift Cards</h1>
      <p className="mt-1 text-sm text-slate-400">
        {stats._count} active cards · {formatPrice(stats._sum.balance ?? 0)} outstanding
        balance (a liability — it&apos;s prepaid revenue).
      </p>

      {error === "amount" && (
        <p className="mt-4 rounded-lg border border-coral-500/40 bg-coral-500/10 px-4 py-2 text-sm text-coral-300">
          Comp cards need an amount between $1 and $1000.
        </p>
      )}

      {/* Issue comp card */}
      <form
        action={issueCompGiftCard}
        className="mt-6 grid gap-3 rounded-2xl border border-abyss-700/60 bg-abyss-900 p-5 sm:grid-cols-3"
      >
        <div>
          <label className={label} htmlFor="gc-amount">Comp card amount ($)</label>
          <input id="gc-amount" name="amount" type="number" min={1} max={1000} step="0.01"
            required className={input} />
        </div>
        <div>
          <label className={label} htmlFor="gc-note">Note (why issued)</label>
          <input id="gc-note" name="note" placeholder="DOA replacement — order #1042" className={input} />
        </div>
        <div className="flex items-end">
          <button className="w-full rounded-full bg-coral-500 py-2.5 text-sm font-semibold text-white transition hover:bg-coral-600">
            Issue Comp Card
          </button>
        </div>
      </form>

      {cards.length === 0 ? (
        <p className="mt-6 text-slate-400">No gift cards yet.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-abyss-700/60">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-abyss-900 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3 text-right">Balance</th>
                <th className="px-4 py-3">Recipient</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-abyss-800 bg-abyss-950">
              {cards.map((c) => (
                <tr key={c.id} className="hover:bg-abyss-900">
                  <td className="px-4 py-2 font-mono text-xs font-bold text-reef-300">{c.code}</td>
                  <td className="px-4 py-2 text-right">
                    <span className="font-semibold text-slate-200">{formatPrice(c.balance)}</span>
                    <span className="text-xs text-slate-500"> / {formatPrice(c.initialBalance)}</span>
                  </td>
                  <td className="px-4 py-2 text-xs text-slate-400">
                    {c.recipientName ?? c.recipientEmail ?? "—"}
                    {c.deliveredAt && <span className="text-emerald-400"> ✓ delivered</span>}
                  </td>
                  <td className="px-4 py-2 text-xs text-slate-400">
                    {c.purchaseOrderId
                      ? `Purchased${c.purchasedBy ? ` by ${c.purchasedBy.email}` : ""}`
                      : `Comp${c.message ? ` — ${c.message}` : ""}`}
                    {c._count.ordersRedeemed > 0 && ` · used on ${c._count.ordersRedeemed} order(s)`}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                        c.active
                          ? "bg-emerald-500/20 text-emerald-300"
                          : "bg-slate-500/20 text-slate-300"
                      }`}
                    >
                      {c.active ? "ACTIVE" : c.purchaseOrderId && !c.deliveredAt ? "AWAITING PAYMENT" : "OFF"}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <form action={toggleGiftCard}>
                      <input type="hidden" name="giftCardId" value={c.id} />
                      <button className="text-xs text-slate-400 hover:text-coral-300">
                        {c.active ? "Deactivate" : "Activate"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
