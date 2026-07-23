import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-reef-500/10 bg-abyss-900">
      {/* Newsletter band */}
      <div className="border-b border-abyss-800">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-10 text-center md:flex-row md:justify-between md:text-left">
          <div>
            <p className="font-[family-name:var(--font-display)] text-xl font-bold">
              Join the weekly <span className="text-gradient">Coral Drop</span>
            </p>
            <p className="mt-1 text-sm text-slate-400">
              New WYSIWYG frags, rare fish, and subscriber-only deals — every week.
            </p>
          </div>
          <form className="flex w-full max-w-md gap-2">
            <input
              type="email"
              placeholder="you@reef.com"
              className="flex-1 rounded-full border border-abyss-700 bg-abyss-950 px-5 py-2.5 text-sm placeholder:text-slate-500 focus:border-reef-500/60 focus:outline-none"
            />
            <button
              type="button"
              className="rounded-full bg-coral-500 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-coral-600"
            >
              Subscribe
            </button>
          </form>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 text-sm text-slate-400 md:grid-cols-4">
        <div>
          <p className="font-[family-name:var(--font-display)] text-xl font-extrabold">
            <span className="text-reef-400">Aqua</span>
            <span className="text-coral-400">Vida</span>
            <span className="text-xs font-bold text-slate-500">365</span>
          </p>
          <p className="mt-3 max-w-xs leading-relaxed">
            Premium corals, rare saltwater fish, and reef-safe invertebrates —
            photographed in our tanks, shipped overnight with a live-arrival guarantee.
          </p>
        </div>
        <div>
          <p className="mb-3 font-semibold uppercase tracking-wider text-slate-200">Shop</p>
          <ul className="space-y-2">
            <li><Link href="/shop?type=CORAL" className="hover:text-reef-300">Corals</Link></li>
            <li><Link href="/shop?type=FISH" className="hover:text-reef-300">Saltwater Fish</Link></li>
            <li><Link href="/shop?type=INVERTEBRATE" className="hover:text-reef-300">Invertebrates</Link></li>
            <li><Link href="/shop?category=wysiwyg" className="hover:text-reef-300">WYSIWYG</Link></li>
          </ul>
        </div>
        <div>
          <p className="mb-3 font-semibold uppercase tracking-wider text-slate-200">Account</p>
          <ul className="space-y-2">
            <li><Link href="/account" className="hover:text-reef-300">My Account</Link></li>
            <li><Link href="/cart" className="hover:text-reef-300">Cart</Link></li>
            <li><Link href="/register" className="hover:text-reef-300">Create Account</Link></li>
          </ul>
        </div>
        <div>
          <p className="mb-3 font-semibold uppercase tracking-wider text-slate-200">Help</p>
          <ul className="space-y-2">
            <li><Link href="/shipping" className="hover:text-reef-300">Shipping Policy</Link></li>
            <li><Link href="/guarantee" className="hover:text-reef-300">Live Arrival Guarantee</Link></li>
            <li><Link href="/guarantee" className="hover:text-reef-300">Returns & Refunds</Link></li>
            <li><Link href="/contact" className="hover:text-reef-300">Contact Us</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-abyss-800 py-4 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} AquaVida365. All rights reserved.
      </div>
    </footer>
  );
}
