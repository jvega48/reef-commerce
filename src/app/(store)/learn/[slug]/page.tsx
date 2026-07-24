import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { sanitizeDescription } from "@/lib/sanitize";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await prisma.article.findUnique({ where: { slug } });
  if (!article || !article.published) return {};
  return {
    title: article.title,
    description: article.excerpt,
    alternates: { canonical: `/learn/${article.slug}` },
    openGraph: {
      title: article.title,
      description: article.excerpt,
      type: "article",
      ...(article.heroImageUrl ? { images: [{ url: article.heroImageUrl }] } : {}),
    },
  };
}

const CATEGORY_LABELS: Record<string, string> = {
  LEARNING: "Learning Center",
  WATER_EDUCATION: "Water Education",
  KNOWLEDGE_BASE: "Help Center",
};

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await prisma.article.findUnique({ where: { slug } });
  if (!article || !article.published) notFound();

  const more = await prisma.article.findMany({
    where: { published: true, category: article.category, id: { not: article.id } },
    orderBy: { publishedAt: "desc" },
    take: 3,
  });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.excerpt,
    datePublished: article.publishedAt.toISOString(),
    dateModified: article.updatedAt.toISOString(),
    author: { "@type": "Organization", name: "AquaVida365" },
  };

  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav className="text-sm text-slate-400" aria-label="Breadcrumb">
        <Link href="/learn" className="hover:text-reef-300">Learning Center</Link>
        {" / "}
        <span className="text-slate-200">{article.title}</span>
      </nav>

      <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-reef-400">
        {CATEGORY_LABELS[article.category]} · {article.readMinutes} min read ·{" "}
        {article.publishedAt.toLocaleDateString()}
      </p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl font-extrabold leading-tight">
        {article.title}
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-slate-400">{article.excerpt}</p>

      {article.heroImageUrl && (
        <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-2xl border border-abyss-700/60">
          <Image
            src={article.heroImageUrl}
            alt=""
            fill
            priority
            sizes="(max-width: 768px) 100vw, 768px"
            className="object-cover"
          />
        </div>
      )}

      <div
        className="prose-reef mt-8 leading-relaxed"
        dangerouslySetInnerHTML={{ __html: sanitizeDescription(article.body) }}
      />

      <div className="mt-12 rounded-2xl border border-reef-500/30 bg-gradient-to-br from-abyss-900 to-abyss-950 p-6 text-center">
        <p className="font-semibold text-slate-200">Ready to put it into practice?</p>
        <p className="mt-1 text-sm text-slate-400">
          Every AquaVida365 animal ships overnight with a live-arrival guarantee.
        </p>
        <Link
          href="/shop"
          className="mt-4 inline-block rounded-full bg-coral-500 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-coral-600"
        >
          Shop the reef →
        </Link>
      </div>

      {more.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-bold">Keep reading</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {more.map((a) => (
              <Link
                key={a.id}
                href={`/learn/${a.slug}`}
                className="rounded-xl border border-abyss-700/60 bg-abyss-900 p-4 transition hover:border-reef-500/50"
              >
                <p className="text-sm font-semibold text-slate-200 hover:text-reef-300">
                  {a.title}
                </p>
                <p className="mt-1 text-xs text-slate-500">{a.readMinutes} min read</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
