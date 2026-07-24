import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/components/ProductCard";
import CopyButton from "@/components/CopyButton";

export const metadata = { title: "Reef Rewards" };

const TIERS = [
  { name: "BRONZE", at: 1_000, perk: "Early access to WYSIWYG drops" },
  { name: "SILVER", at: 2_500, perk: "5% off dry goods, birthday bonus" },
  { name: "GOLD", at: 5_000, perk: "Free shipping over $250" },
  { name: "DIAMOND", at: 10_000, perk: "Concierge sourcing & first pick" },
];

const REASON_LABELS: Record<string, string> = {
  PURCHASE: "Order purchase",
  REVIEW: "Product review",
  REFERRAL: "Friend referral",
  BIRTHDAY: "Birthday bonus",
  SIGNUP: "Signup bonus",
  SOCIAL_SHARE: "Social share",
  REDEEMED: "Points redeemed",
  ADJUSTMENT: "Adjustment",
};

export default async function RewardsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  let user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      pointsTransactions: { orderBy: { createdAt: "desc" }, take: 25 },
    },
  });
  if (!user) redirect("/login");

  // Backfill referral codes for accounts created before the referral program.
  if (!user.referralCode) {
    const code = `AV${user.id.slice(-6).toUpperCase()}`;
    user = await prisma.user.update({
      where: { id: user.id },
      data: { referralCode: code },
      include: { pointsTransactions: { orderBy: { createdAt: "desc" }, take: 25 } },
    });
  }

  const lifetime = user.pointsTransactions
    .filter((t) => t.points > 0)
    .reduce((sum, t) => sum + t.points, 0);
  const currentTier = [...TIERS].reverse().find((t) => lifetime >= t.at);
  const nextTier = TIERS.find((t) => lifetime < t.at);
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const referralLink = `${site}/register?ref=${user.referralCode}`;

  return (
    <div>
      <h1 className="text-2xl font-bold">Reef Rewards</h1>
      <p className="mt-1 text-sm text-slate-400">
        Earn 1 point per $1 spent · 100 points = $1 off at checkout
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-reef-500/30 bg-gradient-to-br from-abyss-900 to-abyss-950 p-5">
          <p className="text-sm text-slate-400">Available Points</p>
          <p className="mt-1 text-3xl font-bold text-reef-300">
            {user.reefPoints.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            worth {formatPrice(user.reefPoints / 100)} at checkout
          </p>
        </div>
        <div className="rounded-xl border border-abyss-700/60 bg-abyss-900 p-5">
          <p className="text-sm text-slate-400">Lifetime Earned</p>
          <p className="mt-1 text-3xl font-bold text-slate-200">{lifetime.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-abyss-700/60 bg-abyss-900 p-5">
          <p className="text-sm text-slate-400">Tier</p>
          <p className="mt-1 text-3xl font-bold text-coral-400">
            {currentTier?.name ?? "REEFER"}
          </p>
          {nextTier && (
            <p className="mt-1 text-xs text-slate-500">
              {(nextTier.at - lifetime).toLocaleString()} pts to {nextTier.name}
            </p>
          )}
        </div>
      </div>

      {/* Tier ladder */}
      <section className="mt-8 rounded-2xl border border-abyss-700/60 bg-abyss-900 p-5">
        <h2 className="font-semibold text-slate-200">Tier Perks</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {TIERS.map((t) => {
            const unlocked = lifetime >= t.at;
            return (
              <div
                key={t.name}
                className={`rounded-xl border p-4 ${
                  unlocked
                    ? "border-reef-500/50 bg-reef-500/5"
                    : "border-abyss-700 bg-abyss-950"
                }`}
              >
                <p className={`font-bold ${unlocked ? "text-reef-300" : "text-slate-400"}`}>
                  {unlocked ? "✓ " : ""}{t.name}
                </p>
                <p className="text-xs text-slate-500">{t.at.toLocaleString()} lifetime pts</p>
                <p className="mt-2 text-xs text-slate-400">{t.perk}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Referral */}
      <section className="mt-6 rounded-2xl border border-coral-500/30 bg-gradient-to-br from-abyss-900 to-abyss-950 p-5">
        <h2 className="font-semibold text-slate-200">Refer a friend, earn 500 points</h2>
        <p className="mt-1 text-sm text-slate-400">
          Share your link — when a friend creates an account and places their first order,
          you get <span className="font-semibold text-reef-300">500 Reef Points</span> ($5).
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <code className="flex-1 truncate rounded-lg border border-abyss-700 bg-abyss-950 px-4 py-2.5 text-sm text-reef-300">
            {referralLink}
          </code>
          <CopyButton text={referralLink} />
        </div>
      </section>

      {/* Ways to earn */}
      <section className="mt-6 grid gap-3 text-sm sm:grid-cols-3">
        {[
          ["🛒", "Shop", "1 point per $1 on every order"],
          ["⭐", "Review", "50 points per approved review"],
          ["🤝", "Refer", "500 points per friend's first order"],
        ].map(([icon, title, desc]) => (
          <div key={title} className="rounded-xl border border-abyss-700/60 bg-abyss-900 p-4">
            <p className="text-xl">{icon}</p>
            <p className="mt-1 font-semibold text-slate-200">{title}</p>
            <p className="text-xs text-slate-400">{desc}</p>
          </div>
        ))}
      </section>

      {/* History */}
      <section className="mt-6 rounded-2xl border border-abyss-700/60 bg-abyss-900">
        <h2 className="border-b border-abyss-800 px-5 py-3 font-semibold text-slate-200">
          Points History
        </h2>
        {user.pointsTransactions.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate-500">No activity yet.</p>
        ) : (
          <div className="divide-y divide-abyss-800">
            {user.pointsTransactions.map((t) => (
              <div key={t.id} className="flex items-center justify-between px-5 py-3 text-sm">
                <div>
                  <p className="text-slate-300">{REASON_LABELS[t.reason] ?? t.reason}</p>
                  <p className="text-xs text-slate-500">
                    {t.createdAt.toLocaleDateString()}
                    {t.note ? ` · ${t.note}` : ""}
                  </p>
                </div>
                <span
                  className={`font-bold ${t.points > 0 ? "text-reef-300" : "text-coral-300"}`}
                >
                  {t.points > 0 ? "+" : ""}{t.points.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
