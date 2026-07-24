"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sanitizeDescription } from "@/lib/sanitize";
import type { ArticleCategory, Role } from "@/generated/prisma/client";

const CONTENT_ROLES: Role[] = ["OWNER", "ADMIN", "MARKETING"];

async function requireContentStaff() {
  const session = await auth();
  if (!session?.user || !CONTENT_ROLES.includes(session.user.role)) {
    throw new Error("Not authorized to manage articles");
  }
  return session;
}

const CATEGORIES: ArticleCategory[] = ["LEARNING", "WATER_EDUCATION", "KNOWLEDGE_BASE"];

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export async function saveArticle(formData: FormData) {
  const session = await requireContentStaff();
  const id = String(formData.get("articleId") ?? "").trim() || null;

  const title = String(formData.get("title") ?? "").trim().slice(0, 200);
  const excerpt = String(formData.get("excerpt") ?? "").trim().slice(0, 500);
  const body = sanitizeDescription(String(formData.get("body") ?? ""));
  const category =
    CATEGORIES.find((c) => c === String(formData.get("category"))) ?? "LEARNING";
  const heroImageUrl = String(formData.get("heroImageUrl") ?? "").trim() || null;
  const tags = String(formData.get("tags") ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const published = formData.get("published") === "on";
  const readMinutes = Math.max(
    1,
    Math.round(body.replace(/<[^>]+>/g, " ").split(/\s+/).length / 200),
  );

  if (!title || !excerpt || !body) {
    redirect(id ? `/admin/articles/${id}?error=missing` : "/admin/articles/new?error=missing");
  }

  const data = { title, excerpt, body, category, heroImageUrl, tags, published, readMinutes };

  let slug: string;
  if (id) {
    const existing = await prisma.article.findUnique({ where: { id } });
    if (!existing) redirect("/admin/articles");
    slug = existing.slug;
    await prisma.article.update({ where: { id }, data });
  } else {
    slug = slugify(title);
    const clash = await prisma.article.findUnique({ where: { slug } });
    if (clash) slug = `${slug}-${Date.now().toString(36)}`;
    await prisma.article.create({ data: { ...data, slug } });
  }

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: id ? "article.update" : "article.create",
      entity: `Article:${slug}`,
    },
  });
  revalidatePath("/learn");
  revalidatePath(`/learn/${slug}`);
  revalidatePath("/admin/articles");
  redirect("/admin/articles");
}

export async function deleteArticle(formData: FormData) {
  const session = await requireContentStaff();
  const id = String(formData.get("articleId") ?? "");
  const article = await prisma.article.findUnique({ where: { id } });
  if (!article) return;
  await prisma.article.delete({ where: { id } });
  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "article.delete",
      entity: `Article:${article.slug}`,
    },
  });
  revalidatePath("/learn");
  revalidatePath("/admin/articles");
}
