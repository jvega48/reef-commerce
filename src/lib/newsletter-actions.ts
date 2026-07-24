"use server";

import { prisma } from "@/lib/prisma";

export type NewsletterState = { ok: boolean; message: string } | null;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function subscribeNewsletter(
  _prev: NewsletterState,
  formData: FormData,
): Promise<NewsletterState> {
  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  const source = String(formData.get("source") ?? "footer").slice(0, 40);
  if (!EMAIL_RE.test(email)) {
    return { ok: false, message: "Please enter a valid email address." };
  }

  await prisma.newsletterSubscriber.upsert({
    where: { email },
    // Re-subscribing after an unsubscribe re-activates the address.
    update: { unsubscribedAt: null },
    create: { email, source },
  });

  return { ok: true, message: "You're in! Watch for the next Coral Drop. 🪸" };
}
