import Image from "next/image";
import Link from "next/link";
import NewsletterForm from "@/components/NewsletterForm";

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
          <NewsletterForm source="footer" />
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 text-sm text-slate-400 sm:grid-cols-2 md:grid-cols-5">
        <div className="sm:col-span-2 md:col-span-1">
          <div className="flex items-center gap-2.5">
            <Image
              src="/brand/logo-mark.png"
              alt="AquaVida365 logo"
              width={36}
              height={36}
              className="h-9 w-9"
            />
            <p className="font-[family-name:var(--font-display)] text-xl font-extrabold">
              <span className="text-reef-400">Aqua</span>
              <span className="text-coral-400">Vida</span>
              <span className="text-xs font-bold text-slate-500">365</span>
            </p>
          </div>
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
            <li><Link href="/gift-cards" className="hover:text-reef-300">Gift Cards</Link></li>
          </ul>
        </div>
        <div>
          <p className="mb-3 font-semibold uppercase tracking-wider text-slate-200">Learn</p>
          <ul className="space-y-2">
            <li><Link href="/learn" className="hover:text-reef-300">Learning Center</Link></li>
            <li><Link href="/learn?category=water" className="hover:text-reef-300">Water Education</Link></li>
            <li><Link href="/learn?category=help" className="hover:text-reef-300">Help Center</Link></li>
            <li><Link href="/faq" className="hover:text-reef-300">FAQ</Link></li>
            <li><Link href="/about" className="hover:text-reef-300">About Us</Link></li>
          </ul>
        </div>
        <div>
          <p className="mb-3 font-semibold uppercase tracking-wider text-slate-200">Account</p>
          <ul className="space-y-2">
            <li><Link href="/account" className="hover:text-reef-300">My Account</Link></li>
            <li><Link href="/account/orders" className="hover:text-reef-300">Order Tracking</Link></li>
            <li><Link href="/account/rewards" className="hover:text-reef-300">Reef Rewards</Link></li>
            <li><Link href="/cart" className="hover:text-reef-300">Cart</Link></li>
            <li><Link href="/wholesale" className="hover:text-reef-300">Wholesale</Link></li>
            <li><Link href="/distributors" className="hover:text-reef-300">Become a Distributor</Link></li>
          </ul>
        </div>
        <div>
          <p className="mb-3 font-semibold uppercase tracking-wider text-slate-200">Help</p>
          <ul className="space-y-2">
            <li><Link href="/shipping" className="hover:text-reef-300">Shipping Policy</Link></li>
            <li><Link href="/guarantee" className="hover:text-reef-300">Live Arrival Guarantee</Link></li>
            <li><Link href="/returns" className="hover:text-reef-300">Returns &amp; Refunds</Link></li>
            <li><Link href="/contact" className="hover:text-reef-300">Contact Us</Link></li>
            <li><Link href="/account/support" className="hover:text-reef-300">Support Tickets</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-abyss-800 py-4">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 text-xs text-slate-500 sm:flex-row">
          <p>© {new Date().getFullYear()} AquaVida365. All rights reserved.</p>
          <p className="flex gap-4">
            <Link href="/privacy" className="hover:text-reef-300">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-reef-300">Terms of Service</Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
