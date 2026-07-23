import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, STAFF_ROLES } from "@/auth";

const NAV = [
  { label: "Dashboard", href: "/admin" },
  { label: "Products", href: "/admin/products" },
  { label: "Orders", href: "/admin/orders" },
  { label: "Customers", href: "/admin/customers" },
  { label: "Settings", href: "/admin/settings" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!STAFF_ROLES.includes(session.user.role)) redirect("/account");

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r border-abyss-700/60 bg-abyss-900 print:hidden">
        <div className="border-b border-abyss-700/60 px-5 py-4">
          <Link href="/admin" className="text-lg font-bold">
            <span className="text-reef-400">AV365</span>{" "}
            <span className="text-sm font-medium text-slate-400">Admin</span>
          </Link>
        </div>
        <nav className="space-y-1 p-3 text-sm">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-lg px-3 py-2 text-slate-300 transition hover:bg-abyss-800 hover:text-reef-300"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-6 border-t border-abyss-700/60 p-3 text-xs text-slate-500">
          <p className="px-3">
            {session.user.name ?? session.user.email}
            <br />
            <span className="text-reef-400">{session.user.role}</span>
          </p>
          <Link href="/" className="mt-2 block px-3 text-slate-400 hover:text-reef-300">
            ← View store
          </Link>
        </div>
      </aside>
      <main className="flex-1 overflow-x-auto p-8 print:p-0">{children}</main>
    </div>
  );
}
