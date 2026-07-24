import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Audit Log — Admin" };

// Audit log is sensitive (shows who did what) — restrict to owner/admin.
const AUDIT_VIEW_ROLES = ["OWNER", "ADMIN"];

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; action?: string }>;
}) {
  const session = await auth();
  if (!session?.user || !AUDIT_VIEW_ROLES.includes(session.user.role)) {
    redirect("/admin");
  }
  const { page: pageParam, action } = await searchParams;
  const page = Math.max(1, Number(pageParam ?? 1) || 1);
  const perPage = 50;

  const where = action ? { action: { startsWith: action } } : {};
  const [logs, total, actionGroups] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      include: { user: { select: { email: true, name: true } } },
    }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.groupBy({ by: ["action"], _count: true, orderBy: { _count: { action: "desc" } } }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-bold">Audit Log</h1>
      <p className="mt-1 text-sm text-slate-400">
        {total} recorded actions. Every create, update, delete, refund, and role change
        lands here.
      </p>

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <a
          href="/admin/audit"
          className={`rounded-full px-3 py-1 font-semibold ${!action ? "bg-reef-500 text-abyss-950" : "bg-abyss-800 text-slate-300 hover:bg-abyss-700"}`}
        >
          All
        </a>
        {actionGroups.slice(0, 14).map((g) => {
          const prefix = g.action.split(".")[0];
          return (
            <a
              key={g.action}
              href={`/admin/audit?action=${prefix}`}
              className={`rounded-full px-3 py-1 font-semibold ${action === prefix ? "bg-reef-500 text-abyss-950" : "bg-abyss-800 text-slate-300 hover:bg-abyss-700"}`}
            >
              {g.action} ({g._count})
            </a>
          );
        })}
      </div>

      {logs.length === 0 ? (
        <p className="mt-8 text-slate-400">No audit entries.</p>
      ) : (
        <div className="mt-5 overflow-x-auto rounded-xl border border-abyss-700/60">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-abyss-900 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Who</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Entity</th>
                <th className="px-4 py-3">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-abyss-800 bg-abyss-950">
              {logs.map((l) => (
                <tr key={l.id} className="align-top hover:bg-abyss-900">
                  <td className="whitespace-nowrap px-4 py-2 text-xs text-slate-400">
                    {l.createdAt.toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-slate-300">
                    {l.user?.name ?? l.user?.email ?? "system"}
                  </td>
                  <td className="px-4 py-2">
                    <span className="rounded bg-abyss-800 px-2 py-0.5 font-mono text-xs text-reef-300">
                      {l.action}
                    </span>
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-slate-400">{l.entity ?? "—"}</td>
                  <td className="px-4 py-2 text-xs text-slate-400">
                    {l.detail ? (
                      <code className="break-all">{JSON.stringify(l.detail)}</code>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-6 flex justify-center gap-2 text-sm">
          {page > 1 && (
            <a
              href={`/admin/audit?page=${page - 1}${action ? `&action=${action}` : ""}`}
              className="rounded bg-abyss-800 px-3 py-1.5 hover:bg-abyss-700"
            >
              ← Prev
            </a>
          )}
          <span className="px-3 py-1.5 text-slate-400">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <a
              href={`/admin/audit?page=${page + 1}${action ? `&action=${action}` : ""}`}
              className="rounded bg-abyss-800 px-3 py-1.5 hover:bg-abyss-700"
            >
              Next →
            </a>
          )}
        </div>
      )}
    </div>
  );
}
