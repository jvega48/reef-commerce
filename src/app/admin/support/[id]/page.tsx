import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { setTicketStatus, staffReply } from "@/lib/support-actions";
import { formatPrice } from "@/components/ProductCard";

export const metadata = { title: "Ticket — Admin" };

const input =
  "w-full rounded-lg border border-abyss-700 bg-abyss-950 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-reef-500/60 focus:outline-none";

export default async function AdminTicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    include: {
      messages: { orderBy: { createdAt: "asc" }, include: { author: { select: { name: true } } } },
      user: { select: { id: true, name: true, email: true, reefPoints: true, createdAt: true } },
      order: {
        select: {
          id: true,
          orderNumber: true,
          total: true,
          status: true,
          createdAt: true,
        },
      },
    },
  });
  if (!ticket) notFound();

  return (
    <div className="max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            #{ticket.number} — {ticket.subject}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {ticket.topic.replace(/_/g, " ").toLowerCase()} ·{" "}
            {ticket.name ?? ticket.email} · opened {ticket.createdAt.toLocaleString()}
          </p>
        </div>
        <Link href="/admin/support" className="text-sm text-slate-400 hover:text-reef-300">
          ← All tickets
        </Link>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Conversation */}
        <div className="space-y-4 lg:col-span-2">
          {ticket.messages.map((m) => (
            <div
              key={m.id}
              className={`max-w-[90%] rounded-2xl border p-4 text-sm ${
                m.fromStaff
                  ? "ml-auto border-reef-500/30 bg-reef-500/5"
                  : "border-abyss-700/60 bg-abyss-900"
              }`}
            >
              <p className="mb-1 text-xs font-semibold text-slate-400">
                {m.fromStaff
                  ? `Staff — ${m.author?.name ?? "AquaVida365"}`
                  : ticket.name ?? ticket.email}{" "}
                · {m.createdAt.toLocaleString()}
              </p>
              <p className="whitespace-pre-line leading-relaxed text-slate-200">{m.body}</p>
            </div>
          ))}

          <form
            action={staffReply}
            className="rounded-2xl border border-abyss-700/60 bg-abyss-900 p-5"
          >
            <input type="hidden" name="ticketId" value={ticket.id} />
            <label
              className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400"
              htmlFor="staff-reply"
            >
              Reply (emailed to customer)
            </label>
            <textarea id="staff-reply" name="body" required rows={5} className={input} />
            <div className="mt-3 flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input type="checkbox" name="resolve" className="h-4 w-4 accent-[#14b5c8]" />
                Mark resolved after sending
              </label>
              <button className="rounded-full bg-reef-500 px-6 py-2.5 text-sm font-semibold text-abyss-950 transition hover:bg-reef-400">
                Send Reply
              </button>
            </div>
          </form>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <section className="rounded-2xl border border-abyss-700/60 bg-abyss-900 p-5">
            <h2 className="mb-3 font-semibold text-slate-200">Status</h2>
            <form action={setTicketStatus} className="flex gap-2">
              <input type="hidden" name="ticketId" value={ticket.id} />
              <select name="status" defaultValue={ticket.status} className={input}>
                <option value="OPEN">Open</option>
                <option value="AWAITING_SUPPORT">Awaiting support</option>
                <option value="AWAITING_CUSTOMER">Awaiting customer</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>
              <button className="shrink-0 rounded-lg bg-abyss-700 px-4 text-sm font-semibold text-slate-200 hover:bg-abyss-600">
                Set
              </button>
            </form>
          </section>

          <section className="rounded-2xl border border-abyss-700/60 bg-abyss-900 p-5 text-sm">
            <h2 className="mb-3 font-semibold text-slate-200">Customer</h2>
            <p className="text-slate-300">{ticket.user?.name ?? ticket.name ?? "Guest"}</p>
            <p className="text-slate-400">{ticket.email}</p>
            {ticket.user && (
              <p className="mt-2 text-xs text-slate-500">
                {ticket.user.reefPoints} Reef Points · joined{" "}
                {ticket.user.createdAt.toLocaleDateString()}
              </p>
            )}
          </section>

          {ticket.order && (
            <section className="rounded-2xl border border-abyss-700/60 bg-abyss-900 p-5 text-sm">
              <h2 className="mb-3 font-semibold text-slate-200">Related Order</h2>
              <Link
                href={`/admin/orders/${ticket.order.id}`}
                className="font-semibold text-reef-300 hover:text-reef-200"
              >
                Order #{ticket.order.orderNumber} →
              </Link>
              <p className="mt-1 text-xs text-slate-500">
                {ticket.order.createdAt.toLocaleDateString()} ·{" "}
                {formatPrice(ticket.order.total)} ·{" "}
                {ticket.order.status.replace(/_/g, " ").toLowerCase()}
              </p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
