import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { deleteArticle } from "@/lib/article-actions";

export const metadata = { title: "Articles — Admin" };

const CATEGORY_LABELS: Record<string, string> = {
  LEARNING: "Learning Center",
  WATER_EDUCATION: "Water Education",
  KNOWLEDGE_BASE: "Knowledge Base",
};

export default async function AdminArticlesPage() {
  const articles = await prisma.article.findMany({
    orderBy: [{ category: "asc" }, { publishedAt: "desc" }],
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Articles</h1>
        <Link
          href="/admin/articles/new"
          className="rounded-full bg-coral-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-coral-500/25 transition hover:bg-coral-600"
        >
          + New Article
        </Link>
      </div>
      <p className="mt-1 text-sm text-slate-400">
        Powers the Learning Center, Water Education series, and support Knowledge Base.
      </p>

      {articles.length === 0 ? (
        <p className="mt-6 text-slate-400">No articles yet — run the content seed or write one.</p>
      ) : (
        <div className="mt-5 overflow-x-auto rounded-xl border border-abyss-700/60">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="bg-abyss-900 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Published</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-abyss-800 bg-abyss-950">
              {articles.map((a) => (
                <tr key={a.id} className="hover:bg-abyss-900">
                  <td className="px-4 py-2 font-medium">
                    <Link href={`/admin/articles/${a.id}`} className="text-reef-300 hover:text-reef-200">
                      {a.title}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-slate-400">{CATEGORY_LABELS[a.category]}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                        a.published
                          ? "bg-emerald-500/20 text-emerald-300"
                          : "bg-amber-500/20 text-amber-300"
                      }`}
                    >
                      {a.published ? "LIVE" : "DRAFT"}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right text-slate-400">
                    {a.publishedAt.toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-3 text-xs">
                      <Link href={`/learn/${a.slug}`} className="text-slate-400 hover:text-reef-300">
                        View
                      </Link>
                      <form action={deleteArticle}>
                        <input type="hidden" name="articleId" value={a.id} />
                        <button className="text-slate-400 hover:text-coral-300">Delete</button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
