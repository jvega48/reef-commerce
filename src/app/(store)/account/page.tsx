import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut, STAFF_ROLES } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/components/ProductCard";

export const metadata = { title: "My Account" };

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      orders: { orderBy: { createdAt: "desc" }, take: 10, include: { items: true } },
      wishlistItems: { include: { product: true }, take: 10 },
    },
  });
  if (!user) redirect("/login");

  const isStaff = STAFF_ROLES.includes(user.role);

  async function logout() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Hey, {user.name ?? user.email}</h1>
          <p className="mt-1 text-slate-400">{user.email}</p>
        </div>
        <div className="flex gap-3">
          {isStaff && (
            <Link
              href="/admin"
              className="rounded-full bg-reef-500 px-5 py-2 text-sm font-semibold text-abyss-950 hover:bg-reef-400"
            >
              Admin Portal
            </Link>
          )}
          <form action={logout}>
            <button className="rounded-full border border-abyss-700 px-5 py-2 text-sm text-slate-300 hover:bg-abyss-800">
              Sign out
            </button>
          </form>
        </div>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-abyss-700/60 bg-abyss-900 p-5">
          <p className="text-sm text-slate-400">Reef Points</p>
          <p className="mt-1 text-2xl font-bold text-reef-300">{user.reefPoints}</p>
        </div>
        <div className="rounded-xl border border-abyss-700/60 bg-abyss-900 p-5">
          <p className="text-sm text-slate-400">Store Credit</p>
          <p className="mt-1 text-2xl font-bold text-reef-300">{formatPrice(user.storeCredit)}</p>
        </div>
        <div className="rounded-xl border border-abyss-700/60 bg-abyss-900 p-5">
          <p className="text-sm text-slate-400">VIP Tier</p>
          <p className="mt-1 text-2xl font-bold text-coral-400">
            {user.vipTier === "NONE" ? "—" : user.vipTier}
          </p>
        </div>
      </div>

      <section className="mt-10">
        <h2 className="text-xl font-bold">Order History</h2>
        {user.orders.length === 0 ? (
          <p className="mt-3 text-slate-400">
            No orders yet.{" "}
            <Link href="/shop" className="text-reef-400 hover:text-reef-300">
              Start shopping →
            </Link>
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            {user.orders.map((o) => (
              <div
                key={o.id}
                className="flex items-center justify-between rounded-xl border border-abyss-700/60 bg-abyss-900 p-4 text-sm"
              >
                <div>
                  <p className="font-semibold">Order #{o.orderNumber}</p>
                  <p className="text-slate-400">
                    {o.createdAt.toLocaleDateString()} · {o.items.length} items
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-reef-300">{formatPrice(o.total)}</p>
                  <p className="text-xs uppercase tracking-wide text-slate-400">{o.status}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
