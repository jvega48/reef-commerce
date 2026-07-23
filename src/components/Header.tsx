import Link from "next/link";
import { auth } from "@/auth";
import { getCartItemCount } from "@/lib/cart";

const NAV = [
  { label: "Corals", href: "/shop?type=CORAL" },
  { label: "Fish", href: "/shop?type=FISH" },
  { label: "Inverts", href: "/shop?type=INVERTEBRATE" },
  { label: "WYSIWYG", href: "/shop?category=wysiwyg" },
  { label: "Shop All", href: "/shop" },
];

export default async function Header() {
  const [session, cartCount] = await Promise.all([auth(), getCartItemCount()]);

  return (
    <header className="sticky top-0 z-40 border-b border-abyss-700/60 bg-abyss-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3">
        <Link href="/" className="flex items-baseline gap-1 text-xl font-bold tracking-tight">
          <span className="text-reef-400">Aqua</span>
          <span className="text-coral-400">Vida</span>
          <span className="text-sm font-semibold text-slate-400">365</span>
        </Link>

        <nav className="hidden gap-5 text-sm font-medium text-slate-300 md:flex">
          {NAV.map((item) => (
            <Link key={item.label} href={item.href} className="hover:text-reef-300">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-4 text-sm">
          {session?.user ? (
            <Link href="/account" className="text-slate-300 hover:text-reef-300">
              {session.user.name?.split(" ")[0] ?? "Account"}
            </Link>
          ) : (
            <Link href="/login" className="text-slate-300 hover:text-reef-300">
              Sign in
            </Link>
          )}
          <Link
            href="/cart"
            className="relative rounded-full bg-abyss-800 px-4 py-1.5 font-semibold text-reef-300 hover:bg-abyss-700"
          >
            Cart
            {cartCount > 0 && (
              <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-coral-500 text-xs font-bold text-white">
                {cartCount}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
