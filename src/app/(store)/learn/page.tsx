import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { ArticleCategory } from "@/generated/prisma/client";

export const metadata: Metadata = {
  title: "Learning Center",
  description:
    "Reef keeping guides from AquaVida365 — acclimation, coral care, water chemistry, and husbandry fundamentals.",
  alternates: { canonical: "/learn" },
};

const CATEGORIES: { key: string; value?: ArticleCategory; label: string; blurb: string }[] = [
  { key: "all", label: "All Guides", blurb: "Everything we've written" },
  { key: "learning", value: "LEARNING", label: "Learning Center", blurb: "Care & husbandry guides" },
  { key: "water", value: "WATER_EDUCATION", label: "Water Education", blurb: "Chemistry & parameters" },
  { key: "help", value: "KNOWLEDGE_BASE", label: "Help Center", blurb: "Orders, shipping & claims" },
];

export default async function LearnPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category = "all" } = await searchParams;
  const active = CATEGORIES.find((c) => c.key === category) ?? CATEGORIES[0];

  const articles = await prisma.article.findMany({
    where: { published: true, ...(active.value ? { category: active.value } : {}) },
    orderBy: [{ category: "asc" }, { publishedAt: "desc" }],
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="text-center">
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-extrabold">
          Learning <span className="text-gradient">Center</span>
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-slate-400">
          Everything we know about keeping corals, fish, and inverts thriving —
          from first acclimation to advanced water chemistry.
        </p>
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-2">
        {CATEGORIES.map((c) => (
          <Link
            key={c.key}
            href={c.key === "all" ? "/learn" : `/learn?category=${c.key}`}
            className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
              c.key === active.key
                ? "bg-reef-500 text-abyss-950"
                : "bg-abyss-800 text-slate-300 hover:bg-abyss-700"
            }`}
          >
            {c.label}
          </Link>
        ))}
      </div>

      {articles.length === 0 ? (
        <p className="mt-12 text-center text-slate-400">No articles here yet — check back soon.</p>
      ) : (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((a) => (
            <Link
              key={a.id}
              href={`/learn/${a.slug}`}
              className="group flex flex-col overflow-hidden rounded-2xl border border-abyss-700/50 bg-abyss-900 transition duration-300 hover:-translate-y-1 hover:border-reef-500/50 hover:shadow-xl hover:shadow-reef-500/10"
            >
              <div className="relative flex aspect-[16/9] items-center justify-center overflow-hidden bg-gradient-to-br from-abyss-800 to-abyss-950 text-5xl">
                {a.heroImageUrl ? (
                  <Image
                    src={a.heroImageUrl}
                    alt=""
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover transition duration-500 group-hover:scale-105"
                  />
                ) : (
                  <span aria-hidden>
                    {a.category === "WATER_EDUCATION" ? "🌊" : a.category === "KNOWLEDGE_BASE" ? "🛟" : "🪸"}
                  </span>
                )}
              </div>
              <div className="flex flex-1 flex-col p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-reef-400">
                  {CATEGORIES.find((c) => c.value === a.category)?.label}
                  {" · "}{a.readMinutes} min read
                </p>
                <h2 className="mt-2 font-semibold text-slate-100 transition group-hover:text-reef-300">
                  {a.title}
                </h2>
                <p className="mt-2 line-clamp-3 flex-1 text-sm text-slate-400">{a.excerpt}</p>
                <p className="mt-3 text-sm font-semibold text-reef-400">Read guide →</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
