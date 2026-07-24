import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { saveArticle } from "@/lib/article-actions";

export const metadata = { title: "Edit Article — Admin" };

const input =
  "w-full rounded-lg border border-abyss-700 bg-abyss-950 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-reef-500/60 focus:outline-none";
const label = "mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400";

export default async function EditArticlePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  const isNew = id === "new";
  const article = isNew
    ? null
    : await prisma.article.findUnique({ where: { id } });
  if (!isNew && !article) notFound();

  return (
    <div className="max-w-3xl">
      <Link href="/admin/articles" className="text-sm text-slate-400 hover:text-reef-300">
        ← All articles
      </Link>
      <h1 className="mt-2 text-2xl font-bold">{isNew ? "New Article" : "Edit Article"}</h1>

      {error === "missing" && (
        <p className="mt-4 rounded-lg border border-coral-500/40 bg-coral-500/10 px-4 py-2 text-sm text-coral-300">
          Title, excerpt, and body are required.
        </p>
      )}

      <form action={saveArticle} className="mt-6 space-y-4">
        {article && <input type="hidden" name="articleId" value={article.id} />}
        <div>
          <label className={label} htmlFor="ar-title">Title *</label>
          <input id="ar-title" name="title" required maxLength={200}
            defaultValue={article?.title} className={input} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor="ar-category">Category</label>
            <select id="ar-category" name="category" defaultValue={article?.category ?? "LEARNING"} className={input}>
              <option value="LEARNING">Learning Center</option>
              <option value="WATER_EDUCATION">Water Education</option>
              <option value="KNOWLEDGE_BASE">Knowledge Base (support)</option>
            </select>
          </div>
          <div>
            <label className={label} htmlFor="ar-tags">Tags (comma-separated)</label>
            <input id="ar-tags" name="tags" defaultValue={article?.tags.join(", ")} className={input} />
          </div>
        </div>
        <div>
          <label className={label} htmlFor="ar-hero">Hero image URL</label>
          <input id="ar-hero" name="heroImageUrl" defaultValue={article?.heroImageUrl ?? ""}
            placeholder="/uploads/… or https://cdn.shopify.com/…" className={input} />
        </div>
        <div>
          <label className={label} htmlFor="ar-excerpt">Excerpt * (shown on cards &amp; meta description)</label>
          <textarea id="ar-excerpt" name="excerpt" required rows={2} maxLength={500}
            defaultValue={article?.excerpt} className={input} />
        </div>
        <div>
          <label className={label} htmlFor="ar-body">Body * (HTML — h2/h3, p, ul, ol, a, strong, em, img allowed)</label>
          <textarea id="ar-body" name="body" required rows={20}
            defaultValue={article?.body} className={`${input} font-mono text-xs`} />
        </div>
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" name="published" defaultChecked={article?.published ?? true}
              className="h-4 w-4 accent-[#14b5c8]" />
            Published
          </label>
          <button className="rounded-full bg-reef-500 px-8 py-2.5 text-sm font-semibold text-abyss-950 transition hover:bg-reef-400">
            {isNew ? "Create Article" : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
