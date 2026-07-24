import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { TicketStatus } from "@/generated/prisma/client";

export const metadata = { title: "Support — Admin" };

const STATUS_TABS: { key: string; label: string; statuses: TicketStatus[] }[] = [
  { key: "inbox", label: "Inbox", statuses: ["OPEN", "AWAITING_SUPPORT"] },
  { key: "waiting", label: "Waiting on customer", statuses: ["AWAITING_CUSTOMER"] },
  { key: "resolved", label: "Resolved", statuses: ["RESOLVED"] },
  { key: "closed", label: "Closed", statuses: ["CLOSED"] },
  { key: "all", label: "All", statuses: [] },
];

export default async function AdminSupportPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab = "inbox" } = await searchParams;
  const active = STATUS_TABS.find((t) => t.key === tab) ?? STATUS_TABS[0];

  const [tickets, counts] = await Promise.all([
    prisma.supportTicket.findMany({
      where: active.statuses.length ? { status: { in: active.statuses } } : {},
      orderBy: { updatedAt: "desc" },
      take: 100,
      include: {
        order: { select: { orderNumber: true } },
        _count: { select: { messages: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    }),
    prisma.supportTicket.groupBy({ by: ["status"], _count: true }),
  ]);
  const countFor = (statuses: TicketStatus[]) =>
    statuses.length === 0
      ? counts.reduce((n, c) => n + c._count, 0)
      : counts.filter((c) => statuses.includes(c.status)).reduce((n, c) => n + c._count, 0);

  return (
    <div>
      <h1 className="text-2xl font-bold">Support Tickets</h1>

      <div className="mt-4 flex gap-2 overflow-x-auto">
        {STATUS_TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin/support?tab=${t.key}`}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              t.key === active.key
                ? "bg-reef-500 text-abyss-950"
                : "bg-abyss-800 text-slate-300 hover:bg-abyss-700"
            }`}
          >
            {t.label} ({countFor(t.statuses)})
          </Link>
        ))}
      </div>

      {tickets.length === 0 ? (
        <p className="mt-8 text-slate-400">Nothing here — inbox zero. 🎉</p>
      ) : (
        <div className="mt-5 space-y-2">
          {tickets.map((t) => (
            <Link
              key={t.id}
              href={`/admin/support/${t.id}`}
              className="flex items-center gap-4 rounded-xl border border-abyss-700/60 bg-abyss-900 px-4 py-3 text-sm transition hover:border-reef-500/50"
            >
              <span className="w-14 shrink-0 font-bold text-reef-300">#{t.number}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-slate-200">{t.subject}</p>
                <p className="truncate text-xs text-slate-500">
                  {t.name ?? t.email} · {t.topic.replace(/_/g, " ").toLowerCase()}
                  {t.order && ` · order #${t.order.orderNumber}`}
                  {t.messages[0] && ` · "${t.messages[0].body.slice(0, 60)}…"`}
                </p>
              </div>
              <div className="shrink-0 text-right text-xs text-slate-400">
                <p className="font-semibold uppercase">{t.status.replace(/_/g, " ")}</p>
                <p>{t.updatedAt.toLocaleDateString()} · {t._count.messages} msgs</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
