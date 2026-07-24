"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/generated/prisma/client";

// Only the OWNER manages staff roles — the highest-privilege action in the app.
async function requireOwner() {
  const session = await auth();
  if (!session?.user || session.user.role !== "OWNER") {
    throw new Error("Only the owner can manage staff roles");
  }
  return session;
}

const ASSIGNABLE: Role[] = [
  "ADMIN",
  "INVENTORY_MANAGER",
  "SHIPPING_MANAGER",
  "SUPPORT",
  "MARKETING",
  "VIEWER",
  "CUSTOMER",
];

export async function setUserRole(formData: FormData) {
  const session = await requireOwner();
  const userId = String(formData.get("userId") ?? "");
  const role = ASSIGNABLE.find((r) => r === String(formData.get("role")));
  if (!userId || !role) redirect("/admin/staff?error=invalid");

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) redirect("/admin/staff");
  // Never let the owner demote themselves (would lock everyone out of role mgmt).
  if (target.id === session.user.id) redirect("/admin/staff?error=self");
  // The single OWNER role isn't reassignable here — protects the root account.
  if (target.role === "OWNER") redirect("/admin/staff?error=owner");

  await prisma.user.update({ where: { id: userId }, data: { role } });
  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "user.role_change",
      entity: `User:${userId}`,
      detail: { from: target.role, to: role, email: target.email },
    },
  });
  revalidatePath("/admin/staff");
  redirect("/admin/staff?saved=1");
}

export async function promoteToStaff(formData: FormData) {
  const session = await requireOwner();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = ASSIGNABLE.find((r) => r === String(formData.get("role")));
  if (!email || !role) redirect("/admin/staff?error=invalid");

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) redirect("/admin/staff?error=notfound");
  await prisma.user.update({ where: { id: user.id }, data: { role } });
  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "user.role_change",
      entity: `User:${user.id}`,
      detail: { from: user.role, to: role, email },
    },
  });
  revalidatePath("/admin/staff");
  redirect("/admin/staff?saved=1");
}
