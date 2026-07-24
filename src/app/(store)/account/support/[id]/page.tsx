import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { customerReply } from "@/lib/support-actions";

export const metadata = { title: "Support Ticket" };

export default async function TicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login?next=/account/support");

  const { id } = await params;
  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      order: { select: { id: true, orderNumber: true } },
    },
  });
  if (!ticket) notFound();
  const owns =
    ticket.userId === session.user.id ||
    ticket.email.toLowerCase() === session.user.email?.toLowerCase();
  if (!owns) notFound();

  const closed = ticket.status === "CLOSED";

  return (
    <div className="max-w-3xl">
      <Link href="/account/support" className="text-sm text-slate-400 hover:text-reef-300">
        ← All tickets
      </Link>
      <h1 className="mt-2 text-2xl font-bold">
        #{ticket.number} — {ticket.subject}
      </h1>
      <p className="mt-1 text-sm text-slate-400">
        {ticket.topic.replace(/_/g, " ").toLowerCase()} · opened{" "}
        {ticket.createdAt.toLocaleDateString()}
        {ticket.order && (
          <>
            {" · "}
            <Link
              href={`/account/orders/${ticket.order.id}`}
              className="text-reef-400 hover:text-reef-300"
            >
              Order #{ticket.order.orderNumber}
            </Link>
          </>
        )}
      </p>

      <div className="mt-6 space-y-4">
        {ticket.messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-[85%] rounded-2xl border p-4 text-sm ${
              m.fromStaff
                ? "border-reef-500/30 bg-reef-500/5"
                : "ml-auto border-abyss-700/60 bg-abyss-900"
            }`}
          >
            <p className="mb-1 text-xs font-semibold text-slate-400">
              {m.fromStaff ? "🪸 AquaVida365 Support" : "You"} ·{" "}
              {m.createdAt.toLocaleString()}
            </p>
            <p className="whitespace-pre-line leading-relaxed text-slate-200">{m.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-abyss-700/60 bg-abyss-900 p-5">
        {closed ? (
          <p className="text-sm text-slate-400">
            This ticket is closed. Need more help?{" "}
            <Link href="/account/support" className="text-reef-400 hover:text-reef-300">
              Open a new ticket
            </Link>
            .
          </p>
        ) : (
          <form action={customerReply} className="space-y-3">
            <input type="hidden" name="ticketId" value={ticket.id} />
            <label
              className="block text-xs font-semibold uppercase tracking-wide text-slate-400"
              htmlFor="reply-body"
            >
              Reply
            </label>
            <textarea
              id="reply-body"
              name="body"
              required
              rows={4}
              maxLength={8000}
              className="w-full rounded-lg border border-abyss-700 bg-abyss-950 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-reef-500/60 focus:outline-none"
            />
            <button className="rounded-full bg-reef-500 px-6 py-2.5 text-sm font-semibold text-abyss-950 transition hover:bg-reef-400">
              Send Reply
            </button>
            {ticket.status === "RESOLVED" && (
              <p className="text-xs text-slate-500">
                This ticket is marked resolved — replying reopens it.
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
