import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createTicket } from "@/lib/support-actions";

export const metadata = { title: "Support" };

const input =
  "w-full rounded-lg border border-abyss-700 bg-abyss-950 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-reef-500/60 focus:outline-none";
const label = "mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400";

const STATUS_LABELS: Record<string, [string, string]> = {
  OPEN: ["Open", "bg-amber-500/20 text-amber-300"],
  AWAITING_SUPPORT: ["We're on it", "bg-reef-500/20 text-reef-300"],
  AWAITING_CUSTOMER: ["Reply needed", "bg-coral-500/20 text-coral-300"],
  RESOLVED: ["Resolved", "bg-emerald-500/20 text-emerald-300"],
  CLOSED: ["Closed", "bg-slate-500/20 text-slate-300"],
};

export default async function SupportPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; error?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login?next=/account/support");
  const { order: preselectedOrder, error } = await searchParams;

  const [tickets, orders] = await Promise.all([
    prisma.supportTicket.findMany({
      where: {
        OR: [{ userId: session.user.id }, { email: session.user.email ?? "" }],
      },
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { messages: true } } },
    }),
    prisma.order.findMany({
      where: {
        OR: [{ userId: session.user.id }, { email: session.user.email ?? "" }],
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, orderNumber: true, createdAt: true },
    }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold">Support</h1>
      <p className="mt-1 text-sm text-slate-400">
        DOA claim? Remember: unboxing video within 2 hours of delivery, claims within 3 days.
      </p>

      {error === "missing" && (
        <p className="mt-4 rounded-lg border border-coral-500/40 bg-coral-500/10 px-4 py-2 text-sm text-coral-300">
          Please fill in a subject and message.
        </p>
      )}
      {error === "ratelimit" && (
        <p className="mt-4 rounded-lg border border-coral-500/40 bg-coral-500/10 px-4 py-2 text-sm text-coral-300">
          Too many tickets in the last hour — please add to an existing ticket instead.
        </p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Existing tickets */}
        <div className="space-y-3">
          <h2 className="font-semibold text-slate-200">Your tickets</h2>
          {tickets.length === 0 ? (
            <div className="rounded-2xl border border-abyss-700/60 bg-abyss-900 p-8 text-center text-sm text-slate-400">
              No tickets yet. Need a hand? Open one. →
            </div>
          ) : (
            tickets.map((t) => {
              const [statusLabel, statusStyle] =
                STATUS_LABELS[t.status] ?? [t.status, "bg-abyss-800 text-slate-300"];
              return (
                <Link
                  key={t.id}
                  href={`/account/support/${t.id}`}
                  className="block rounded-2xl border border-abyss-700/60 bg-abyss-900 p-4 transition hover:border-reef-500/50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-semibold text-slate-200">
                      #{t.number} — {t.subject}
                    </p>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${statusStyle}`}>
                      {statusLabel}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {t._count.messages} message{t._count.messages === 1 ? "" : "s"} · updated{" "}
                    {t.updatedAt.toLocaleDateString()}
                  </p>
                </Link>
              );
            })
          )}
        </div>

        {/* New ticket */}
        <div className="rounded-2xl border border-abyss-700/60 bg-abyss-900 p-5">
          <h2 className="font-semibold text-slate-200">Open a new ticket</h2>
          <form action={createTicket} className="mt-4 space-y-3">
            <div>
              <label className={label} htmlFor="tk-topic">Topic</label>
              <select id="tk-topic" name="topic" className={input}
                defaultValue={preselectedOrder ? "ORDER_ISSUE" : "OTHER"}>
                <option value="ORDER_ISSUE">Order issue</option>
                <option value="DOA_CLAIM">DOA / live-arrival claim</option>
                <option value="SHIPPING">Shipping question</option>
                <option value="PRODUCT_QUESTION">Product question</option>
                <option value="ACCOUNT">Account help</option>
                <option value="WHOLESALE">Wholesale inquiry</option>
                <option value="OTHER">Something else</option>
              </select>
            </div>
            {orders.length > 0 && (
              <div>
                <label className={label} htmlFor="tk-order">Related order (optional)</label>
                <select id="tk-order" name="orderId" defaultValue={preselectedOrder ?? ""} className={input}>
                  <option value="">— none —</option>
                  {orders.map((o) => (
                    <option key={o.id} value={o.id}>
                      #{o.orderNumber} · {o.createdAt.toLocaleDateString()}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className={label} htmlFor="tk-subject">Subject</label>
              <input id="tk-subject" name="subject" required maxLength={200} className={input} />
            </div>
            <div>
              <label className={label} htmlFor="tk-body">Message</label>
              <textarea id="tk-body" name="body" required rows={5} maxLength={8000}
                placeholder="Tell us what's going on — include your unboxing video link for DOA claims."
                className={input} />
            </div>
            <button className="w-full rounded-full bg-coral-500 py-2.5 text-sm font-semibold text-white transition hover:bg-coral-600">
              Submit Ticket
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
