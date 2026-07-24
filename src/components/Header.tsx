import Image from "next/image";
import Link from "next/link";
import { auth } from "@/auth";
import { getCartItemCount } from "@/lib/cart";
import SearchBox from "@/components/SearchBox";

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
    <div className="sticky top-0 z-40">
      {/* Announcement bar */}
      <div className="bg-gradient-to-r from-reef-600 via-reef-500 to-coral-500 py-1.5 text-center text-xs font-semibold tracking-wide text-abyss-950">
        Overnight shipping on all livestock&nbsp;·&nbsp;100% live-arrival guarantee&nbsp;·&nbsp;Earn Reef Points on every order
      </div>

      <header className="border-b border-reef-500/10 bg-abyss-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center gap-8 px-4 py-3.5">
          <Link
            href="/"
            className="flex items-center gap-2.5 font-[family-name:var(--font-display)] text-2xl font-extrabold tracking-tight"
          >
            <Image
              src="/brand/logo-mark.png"
              alt="AquaVida365 logo"
              width={38}
              height={38}
              priority
              className="h-9 w-9"
            />
            <span>
              <span className="text-reef-400">Aqua</span>
              <span className="text-coral-400">Vida</span>
              <span className="align-super text-xs font-bold text-slate-500">365</span>
            </span>
          </Link>

          <nav className="hidden gap-1 text-sm font-medium md:flex">
            {NAV.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="rounded-full px-3.5 py-1.5 text-slate-300 transition hover:bg-abyss-800 hover:text-reef-300"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {/* Search w/ autocomplete */}
            <div className="hidden lg:block">
              <SearchBox />
            </div>

            {/* Account */}
            <Link
              href={session?.user ? "/account" : "/login"}
              className="flex items-center gap-2 rounded-full px-3 py-2 text-sm text-slate-300 transition hover:bg-abyss-800 hover:text-reef-300"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="hidden sm:inline">
                {session?.user ? (session.user.name?.split(" ")[0] ?? "Account") : "Sign in"}
              </span>
            </Link>

            {/* Cart */}
            <Link
              href="/cart"
              className="relative flex items-center gap-2 rounded-full bg-abyss-800 px-4 py-2 text-sm font-semibold text-reef-300 ring-1 ring-reef-500/20 transition hover:bg-abyss-700 hover:ring-reef-500/40"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.3 4.6a1 1 0 00.9 1.4H19M16 21a1 1 0 100-2 1 1 0 000 2zM9 21a1 1 0 100-2 1 1 0 000 2z" />
              </svg>
              Cart
              {cartCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-coral-500 px-1 text-xs font-bold text-white shadow-lg shadow-coral-500/40">
                  {cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </header>
    </div>
  );
}
