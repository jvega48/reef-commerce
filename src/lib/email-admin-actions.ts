"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { sendEmail, emailLayout, emailButton } from "@/lib/email";
import type { Role } from "@/generated/prisma/client";

const EMAIL_ROLES: Role[] = ["OWNER", "ADMIN", "MARKETING"];

// Sends a branded test email so the owner can confirm Resend delivery (or see
// the console fallback) end-to-end. Logs to EmailLog like any other send.
export async function sendTestEmail(formData: FormData) {
  const session = await auth();
  if (!session?.user || !EMAIL_ROLES.includes(session.user.role)) {
    redirect("/admin");
  }
  const to = String(formData.get("to") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    redirect("/admin/emails?error=badaddress");
  }

  const ok = await sendEmail({
    to,
    subject: "AquaVida365 email test ✅",
    html: emailLayout(
      "Your email pipeline works!",
      `<p>This is a test message from your AquaVida365 admin panel. If you're reading it
       in an inbox, transactional email is configured correctly.</p>
       ${emailButton(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000", "Open the store")}
       <p style="font-size:12px;">Sent by ${session.user.email}.</p>`,
    ),
    template: "test",
    meta: { by: session.user.id },
  });

  redirect(`/admin/emails?sent=${ok ? "1" : "fail"}`);
}
