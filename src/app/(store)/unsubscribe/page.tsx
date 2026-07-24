import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Unsubscribe",
  robots: { index: false },
};

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  let done = false;
  if (token) {
    const sub = await prisma.newsletterSubscriber.findUnique({
      where: { unsubscribeToken: token },
    });
    if (sub && !sub.unsubscribedAt) {
      await prisma.newsletterSubscriber.update({
        where: { id: sub.id },
        data: { unsubscribedAt: new Date() },
      });
    }
    done = Boolean(sub);
  }

  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <p className="text-4xl">{done ? "👋" : "🤔"}</p>
      <h1 className="mt-4 text-3xl font-bold">
        {done ? "You're unsubscribed" : "Link not recognized"}
      </h1>
      <p className="mt-3 text-slate-400">
        {done
          ? "No more Coral Drop emails. Transactional emails (orders, tracking, receipts) still arrive as needed."
          : "This unsubscribe link is invalid or was already used. Manage email preferences from your account settings."}
      </p>
      <Link
        href={done ? "/shop" : "/account/settings"}
        className="mt-6 inline-block rounded-full bg-coral-500 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-coral-600"
      >
        {done ? "Back to the reef" : "Account settings"}
      </Link>
    </div>
  );
}
