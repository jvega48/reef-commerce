"use server";

import { createHash, randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { passwordResetEmail } from "@/lib/email-templates";

async function requireUser() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session.user;
}

const str = (fd: FormData, key: string) => {
  const v = String(fd.get(key) ?? "").trim();
  return v || null;
};

// ---------------------------------------------------------------------------
// Profile & preferences
// ---------------------------------------------------------------------------

export async function updateProfile(formData: FormData) {
  const user = await requireUser();
  const name = str(formData, "name");
  const phone = str(formData, "phone");
  await prisma.user.update({
    where: { id: user.id },
    data: { name, phone },
  });
  revalidatePath("/account");
  redirect("/account/settings?saved=profile");
}

export async function updateNotificationPrefs(formData: FormData) {
  const user = await requireUser();
  await prisma.user.update({
    where: { id: user.id },
    data: {
      notifyOrderUpdates: formData.get("notifyOrderUpdates") === "on",
      notifyRestock: formData.get("notifyRestock") === "on",
      marketingOptIn: formData.get("marketingOptIn") === "on",
    },
  });
  redirect("/account/settings?saved=notifications");
}

export async function changePassword(formData: FormData) {
  const user = await requireUser();
  const current = String(formData.get("currentPassword") ?? "");
  const next = String(formData.get("newPassword") ?? "");
  if (next.length < 8) redirect("/account/settings?error=weak");

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser?.passwordHash || !(await bcrypt.compare(current, dbUser.passwordHash))) {
    redirect("/account/settings?error=wrongpass");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(next, 12) },
  });
  await prisma.auditLog.create({
    data: { userId: user.id, action: "user.password_change", entity: `User:${user.id}` },
  });
  redirect("/account/settings?saved=password");
}

// ---------------------------------------------------------------------------
// Addresses
// ---------------------------------------------------------------------------

export async function saveAddress(formData: FormData) {
  const user = await requireUser();
  const id = str(formData, "addressId");
  const data = {
    name: str(formData, "name") ?? "",
    line1: str(formData, "line1") ?? "",
    line2: str(formData, "line2"),
    city: str(formData, "city") ?? "",
    state: (str(formData, "state") ?? "").toUpperCase().slice(0, 2),
    postalCode: str(formData, "postalCode") ?? "",
    phone: str(formData, "phone"),
  };
  if (!data.name || !data.line1 || !data.city || !data.state || !data.postalCode) {
    redirect("/account/addresses?error=missing");
  }

  const makeDefault = formData.get("isDefault") === "on";
  if (id) {
    // Only the owner may edit their address.
    const existing = await prisma.address.findFirst({
      where: { id, userId: user.id },
    });
    if (!existing) redirect("/account/addresses");
    await prisma.address.update({ where: { id }, data });
  } else {
    const count = await prisma.address.count({ where: { userId: user.id } });
    const created = await prisma.address.create({
      data: { ...data, userId: user.id, isDefault: count === 0 },
    });
    if (makeDefault) await setDefault(user.id, created.id);
    revalidatePath("/account/addresses");
    redirect("/account/addresses");
  }
  if (makeDefault) await setDefault(user.id, id!);
  revalidatePath("/account/addresses");
  redirect("/account/addresses");
}

async function setDefault(userId: string, addressId: string) {
  await prisma.$transaction([
    prisma.address.updateMany({ where: { userId }, data: { isDefault: false } }),
    prisma.address.updateMany({
      where: { id: addressId, userId },
      data: { isDefault: true },
    }),
  ]);
}

export async function makeDefaultAddress(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("addressId") ?? "");
  if (id) await setDefault(user.id, id);
  revalidatePath("/account/addresses");
}

export async function deleteAddress(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("addressId") ?? "");
  // Never hard-delete an address referenced by an order — orders keep their
  // shipping snapshot. Detach it from the account instead.
  const address = await prisma.address.findFirst({
    where: { id, userId: user.id },
    include: { orders: { select: { id: true }, take: 1 } },
  });
  if (!address) return;
  if (address.orders.length > 0) {
    await prisma.address.update({ where: { id }, data: { userId: null, isDefault: false } });
  } else {
    await prisma.address.delete({ where: { id } });
  }
  revalidatePath("/account/addresses");
}

// ---------------------------------------------------------------------------
// Wishlist
// ---------------------------------------------------------------------------

export async function toggleWishlist(formData: FormData) {
  const session = await auth();
  const productId = String(formData.get("productId") ?? "");
  const returnTo = str(formData, "returnTo") ?? "/account/wishlist";
  if (!session?.user) redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  if (!productId) return;

  const existing = await prisma.wishlistItem.findUnique({
    where: { userId_productId: { userId: session.user.id, productId } },
  });
  if (existing) {
    await prisma.wishlistItem.delete({ where: { id: existing.id } });
  } else {
    await prisma.wishlistItem.create({
      data: { userId: session.user.id, productId },
    });
  }
  revalidatePath("/account/wishlist");
  revalidatePath(returnTo);
}

// ---------------------------------------------------------------------------
// Password reset (email token flow)
// ---------------------------------------------------------------------------

const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  // Always land on the same confirmation — never reveal whether the email
  // has an account.
  if (email) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      const token = randomBytes(32).toString("hex");
      await prisma.passwordResetToken.create({
        data: {
          tokenHash: createHash("sha256").update(token).digest("hex"),
          email,
          expires: new Date(Date.now() + RESET_TTL_MS),
        },
      });
      const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
      const tpl = passwordResetEmail(`${base}/reset-password?token=${token}`);
      await sendEmail({ to: email, ...tpl, template: "password-reset" });
    }
  }
  redirect("/forgot-password?sent=1");
}

export async function resetPassword(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) {
    redirect(`/reset-password?token=${encodeURIComponent(token)}&error=weak`);
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const row = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!row || row.usedAt || row.expires < new Date()) {
    redirect("/reset-password?error=invalid");
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { email: row.email },
      data: { passwordHash: await bcrypt.hash(password, 12) },
    }),
    prisma.passwordResetToken.update({
      where: { tokenHash },
      data: { usedAt: new Date() },
    }),
  ]);
  redirect("/login?reset=1");
}
