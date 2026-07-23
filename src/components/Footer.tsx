import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-abyss-700/60 bg-abyss-900">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 text-sm text-slate-400 md:grid-cols-3">
        <div>
          <p className="text-lg font-bold">
            <span className="text-reef-400">Aqua</span>
            <span className="text-coral-400">Vida</span>
            <span className="text-slate-400">365</span>
          </p>
          <p className="mt-2 max-w-xs">
            Premium corals, rare saltwater fish, and reef-safe invertebrates —
            shipped overnight with a live-arrival guarantee.
          </p>
        </div>
        <div>
          <p className="mb-2 font-semibold text-slate-200">Shop</p>
          <ul className="space-y-1">
            <li><Link href="/shop?type=CORAL" className="hover:text-reef-300">Corals</Link></li>
            <li><Link href="/shop?type=FISH" className="hover:text-reef-300">Saltwater Fish</Link></li>
            <li><Link href="/shop?type=INVERTEBRATE" className="hover:text-reef-300">Invertebrates</Link></li>
            <li><Link href="/shop?category=wysiwyg" className="hover:text-reef-300">WYSIWYG</Link></li>
          </ul>
        </div>
        <div>
          <p className="mb-2 font-semibold text-slate-200">Support</p>
          <ul className="space-y-1">
            <li><Link href="/account" className="hover:text-reef-300">My Account</Link></li>
            <li><Link href="/cart" className="hover:text-reef-300">Cart</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-abyss-800 py-4 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} AquaVida365. All rights reserved.
      </div>
    </footer>
  );
}
