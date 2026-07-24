import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { approveReview, deleteReview, replyToReview } from "@/lib/review-actions";
import Stars from "@/components/Stars";

export const metadata = { title: "Reviews — Admin" };

const input =
  "w-full rounded-lg border border-abyss-700 bg-abyss-950 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-reef-500/60 focus:outline-none";

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab = "pending" } = await searchParams;
  const showApproved = tab === "approved";

  const [reviews, pendingCount, approvedCount] = await Promise.all([
    prisma.review.findMany({
      where: { approved: showApproved },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        user: { select: { name: true, email: true } },
        product: { select: { name: true, slug: true } },
      },
    }),
    prisma.review.count({ where: { approved: false } }),
    prisma.review.count({ where: { approved: true } }),
  ]);

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold">Reviews</h1>
      <p className="mt-1 text-sm text-slate-400">
        Approving a review publishes it and awards the reviewer 50 Reef Points (once).
      </p>

      <div className="mt-4 flex gap-2">
        <Link
          href="/admin/reviews"
          className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
            !showApproved ? "bg-reef-500 text-abyss-950" : "bg-abyss-800 text-slate-300 hover:bg-abyss-700"
          }`}
        >
          Pending ({pendingCount})
        </Link>
        <Link
          href="/admin/reviews?tab=approved"
          className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
            showApproved ? "bg-reef-500 text-abyss-950" : "bg-abyss-800 text-slate-300 hover:bg-abyss-700"
          }`}
        >
          Approved ({approvedCount})
        </Link>
      </div>

      {reviews.length === 0 ? (
        <p className="mt-8 text-slate-400">
          {showApproved ? "No approved reviews yet." : "Moderation queue is empty. 🎉"}
        </p>
      ) : (
        <div className="mt-5 space-y-4">
          {reviews.map((r) => (
            <article key={r.id} className="rounded-2xl border border-abyss-700/60 bg-abyss-900 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Stars rating={r.rating} />
                  {r.title && <p className="font-semibold text-slate-200">{r.title}</p>}
                  {r.verified && (
                    <span className="rounded-full bg-reef-500/15 px-2 py-0.5 text-[11px] font-semibold text-reef-300">
                      ✓ Verified
                    </span>
                  )}
                </div>
                <Link
                  href={`/product/${r.product.slug}#reviews`}
                  className="text-xs text-reef-400 hover:text-reef-300"
                >
                  {r.product.name} ↗
                </Link>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {r.user.name ?? r.user.email} · {r.createdAt.toLocaleDateString()}
              </p>
              {r.body && <p className="mt-3 text-sm leading-relaxed text-slate-300">{r.body}</p>}

              <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-abyss-800 pt-3">
                {!r.approved && (
                  <form action={approveReview}>
                    <input type="hidden" name="reviewId" value={r.id} />
                    <button className="rounded-full bg-reef-500 px-5 py-1.5 text-xs font-bold text-abyss-950 transition hover:bg-reef-400">
                      Approve & Award Points
                    </button>
                  </form>
                )}
                <form action={deleteReview}>
                  <input type="hidden" name="reviewId" value={r.id} />
                  <button className="rounded-full bg-coral-500/15 px-5 py-1.5 text-xs font-bold text-coral-300 transition hover:bg-coral-500/25">
                    Delete
                  </button>
                </form>
                <form action={replyToReview} className="flex flex-1 gap-2">
                  <input type="hidden" name="reviewId" value={r.id} />
                  <input
                    name="reply"
                    defaultValue={r.adminReply ?? ""}
                    placeholder="Public reply from the shop (blank to clear)…"
                    className={input}
                  />
                  <button className="shrink-0 rounded-lg bg-abyss-700 px-4 text-xs font-semibold text-slate-200 hover:bg-abyss-600">
                    Reply
                  </button>
                </form>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
