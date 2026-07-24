import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendTestEmail } from "@/lib/email-admin-actions";

export const metadata = { title: "Email — Admin" };

// Every transactional email template the platform sends, for reference.
const TEMPLATES: [string, string][] = [
  ["welcome", "Account welcome + referral link"],
  ["order-confirmation", "Order placed & paid"],
  ["shipment", "Shipped + tracking number"],
  ["order-status", "Ready to ship / delivered / cancelled"],
  ["refund", "Refund issued"],
  ["gift-card", "Gift card delivery to recipient"],
  ["password-reset", "Password reset link"],
  ["restock", "Back-in-stock alert"],
  ["abandoned-cart", "Cart recovery reminder"],
  ["ticket-reply", "Support ticket reply"],
  ["test", "Admin test send"],
];

export default async function AdminEmailsPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string; template?: string }>;
}) {
  const session = await auth();
  if (!session?.user || !["OWNER", "ADMIN", "MARKETING"].includes(session.user.role)) {
    redirect("/admin");
  }
  const { sent, error, template } = await searchParams;

  const where = template ? { template } : {};
  const [logs, counts, resendConfigured] = await Promise.all([
    prisma.emailLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.emailLog.groupBy({ by: ["status"], _count: true }),
    Promise.resolve(Boolean(process.env.RESEND_API_KEY)),
  ]);
  const statusCount = (s: string) =>
    counts.find((c) => c.status === s)?._count ?? 0;

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-bold">Email</h1>
      <p className="mt-1 text-sm text-slate-400">
        {resendConfigured ? (
          <span className="text-emerald-300">✓ Resend is configured — emails send for real.</span>
        ) : (
          <span className="text-amber-300">
            ⚠ No RESEND_API_KEY — emails are logged to the server console (dev mode).
            Add the key to start delivering.
          </span>
        )}
      </p>

      {sent === "1" && (
        <p className="mt-4 rounded-lg border border-reef-500/40 bg-reef-500/10 px-4 py-2 text-sm text-reef-300">
          Test email sent (check inbox or server console).
        </p>
      )}
      {sent === "fail" && (
        <p className="mt-4 rounded-lg border border-coral-500/40 bg-coral-500/10 px-4 py-2 text-sm text-coral-300">
          Test send failed — see the row below for the error.
        </p>
      )}
      {error === "badaddress" && (
        <p className="mt-4 rounded-lg border border-coral-500/40 bg-coral-500/10 px-4 py-2 text-sm text-coral-300">
          Enter a valid email address.
        </p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Templates + test send */}
        <div className="space-y-6">
          <section className="rounded-2xl border border-abyss-700/60 bg-abyss-900 p-5">
            <h2 className="font-semibold text-slate-200">Send a test</h2>
            <form action={sendTestEmail} className="mt-3 space-y-2">
              <input
                type="email"
                name="to"
                required
                defaultValue={session.user.email ?? ""}
                className="w-full rounded-lg border border-abyss-700 bg-abyss-950 px-3 py-2 text-sm text-slate-200 focus:border-reef-500/60 focus:outline-none"
              />
              <button className="w-full rounded-full bg-reef-500 py-2 text-sm font-semibold text-abyss-950 transition hover:bg-reef-400">
                Send Test Email
              </button>
            </form>
          </section>

          <section className="rounded-2xl border border-abyss-700/60 bg-abyss-900 p-5">
            <h2 className="font-semibold text-slate-200">Templates</h2>
            <p className="mt-1 text-xs text-slate-500">
              All emails share the branded layout. Dynamic values (rates, guarantee
              windows) come from Store Settings.
            </p>
            <ul className="mt-3 space-y-1.5 text-sm">
              {TEMPLATES.map(([key, desc]) => (
                <li key={key} className="flex items-baseline justify-between gap-2">
                  <a
                    href={`/admin/emails?template=${key}`}
                    className="font-mono text-xs text-reef-300 hover:text-reef-200"
                  >
                    {key}
                  </a>
                  <span className="text-right text-xs text-slate-400">{desc}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Log */}
        <section className="lg:col-span-2">
          <div className="mb-3 flex items-center gap-3 text-xs">
            <span className="text-slate-400">
              Sent {statusCount("SENT")} · Console {statusCount("CONSOLE")} · Failed{" "}
              <span className="text-coral-300">{statusCount("FAILED")}</span>
            </span>
            {template && (
              <a href="/admin/emails" className="text-reef-400 hover:text-reef-300">
                clear filter ({template}) ✕
              </a>
            )}
          </div>
          <div className="overflow-x-auto rounded-xl border border-abyss-700/60">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="bg-abyss-900 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3">When</th>
                  <th className="px-4 py-3">To</th>
                  <th className="px-4 py-3">Template</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-abyss-800 bg-abyss-950">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                      No emails logged yet.
                    </td>
                  </tr>
                ) : (
                  logs.map((l) => (
                    <tr key={l.id} className="hover:bg-abyss-900">
                      <td className="whitespace-nowrap px-4 py-2 text-xs text-slate-400">
                        {l.createdAt.toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-slate-300">{l.to}</td>
                      <td className="px-4 py-2 font-mono text-xs text-slate-400">{l.template}</td>
                      <td className="px-4 py-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                            l.status === "SENT"
                              ? "bg-emerald-500/20 text-emerald-300"
                              : l.status === "FAILED"
                                ? "bg-coral-500/20 text-coral-300"
                                : "bg-slate-500/20 text-slate-300"
                          }`}
                          title={l.error ?? undefined}
                        >
                          {l.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
