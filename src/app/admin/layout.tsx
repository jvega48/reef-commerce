import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, STAFF_ROLES } from "@/auth";

import type { Role } from "@/generated/prisma/client";

// Each link declares which roles may see it. VIEWER sees read-only sections;
// specialized managers see their domain; OWNER/ADMIN see everything.
const ALL: Role[] = [
  "OWNER", "ADMIN", "INVENTORY_MANAGER", "SHIPPING_MANAGER",
  "SUPPORT", "MARKETING", "VIEWER",
];
const NAV: { label: string; href: string; roles: Role[] }[] = [
  { label: "Dashboard", href: "/admin", roles: ALL },
  { label: "Analytics", href: "/admin/analytics", roles: ["OWNER", "ADMIN", "MARKETING", "VIEWER"] },
  { label: "Products", href: "/admin/products", roles: ["OWNER", "ADMIN", "INVENTORY_MANAGER", "VIEWER"] },
  { label: "Orders", href: "/admin/orders", roles: ["OWNER", "ADMIN", "SHIPPING_MANAGER", "SUPPORT", "VIEWER"] },
  { label: "Packing Queue", href: "/admin/packing", roles: ["OWNER", "ADMIN", "SHIPPING_MANAGER", "VIEWER"] },
  { label: "Customers", href: "/admin/customers", roles: ["OWNER", "ADMIN", "SUPPORT", "MARKETING", "VIEWER"] },
  { label: "Reviews", href: "/admin/reviews", roles: ["OWNER", "ADMIN", "MARKETING", "SUPPORT", "VIEWER"] },
  { label: "Support", href: "/admin/support", roles: ["OWNER", "ADMIN", "SUPPORT", "SHIPPING_MANAGER", "VIEWER"] },
  { label: "Coupons", href: "/admin/coupons", roles: ["OWNER", "ADMIN", "MARKETING"] },
  { label: "Gift Cards", href: "/admin/gift-cards", roles: ["OWNER", "ADMIN", "MARKETING"] },
  { label: "Articles", href: "/admin/articles", roles: ["OWNER", "ADMIN", "MARKETING"] },
  { label: "Email", href: "/admin/emails", roles: ["OWNER", "ADMIN", "MARKETING"] },
  { label: "Audit Log", href: "/admin/audit", roles: ["OWNER", "ADMIN"] },
  { label: "Staff & Roles", href: "/admin/staff", roles: ["OWNER"] },
  { label: "Settings", href: "/admin/settings", roles: ["OWNER", "ADMIN"] },
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
          <Link href="/admin" className="flex items-center gap-2 text-lg font-bold">
            <Image
              src="/brand/logo-mark.png"
              alt="AquaVida365 logo"
              width={28}
              height={28}
              className="h-7 w-7"
            />
            <span>
              <span className="text-reef-400">AV365</span>{" "}
              <span className="text-sm font-medium text-slate-400">Admin</span>
            </span>
          </Link>
        </div>
        <nav className="space-y-1 p-3 text-sm">
          {NAV.filter((item) => item.roles.includes(session.user.role)).map((item) => (
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
