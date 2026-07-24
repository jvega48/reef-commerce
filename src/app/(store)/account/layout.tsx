import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut, STAFF_ROLES } from "@/auth";

const NAV = [
  { label: "Dashboard", href: "/account", icon: "🏠" },
  { label: "Orders", href: "/account/orders", icon: "📦" },
  { label: "Wishlist", href: "/account/wishlist", icon: "🤍" },
  { label: "Reef Rewards", href: "/account/rewards", icon: "✨" },
  { label: "Addresses", href: "/account/addresses", icon: "📍" },
  { label: "Support", href: "/account/support", icon: "💬" },
  { label: "Settings", href: "/account/settings", icon: "⚙️" },
];

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login?next=/account");
  const isStaff = STAFF_ROLES.includes(session.user.role);

  async function logout() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 md:flex-row">
      <aside className="w-full shrink-0 md:w-56">
        <nav className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible" aria-label="Account">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex shrink-0 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-abyss-800 hover:text-reef-300"
            >
              <span aria-hidden>{item.icon}</span>
              {item.label}
            </Link>
          ))}
          {isStaff && (
            <Link
              href="/admin"
              className="flex shrink-0 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-reef-300 transition hover:bg-abyss-800"
            >
              <span aria-hidden>🛠️</span>
              Admin Portal
            </Link>
          )}
          <form action={logout} className="md:mt-4 md:border-t md:border-abyss-800 md:pt-3">
            <button className="flex w-full shrink-0 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-left text-sm text-slate-400 transition hover:bg-abyss-800 hover:text-coral-300">
              <span aria-hidden>👋</span>
              Sign out
            </button>
          </form>
        </nav>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
