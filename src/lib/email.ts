import { prisma } from "./prisma";

// ---------------------------------------------------------------------------
// Outbound email. Uses Resend's REST API when RESEND_API_KEY is set; otherwise
// logs the message to the console so every flow works in development. Every
// send attempt is recorded in EmailLog (also used to dedupe abandoned-cart
// reminders). Failures never throw — an email problem must not break checkout.
// ---------------------------------------------------------------------------

const FROM = process.env.EMAIL_FROM ?? "AquaVida365 <orders@aquavida365.com>";

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  template: string;
  meta?: Record<string, unknown>;
}): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  let status = "CONSOLE";
  let error: string | null = null;

  if (key) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: FROM,
          to: [opts.to],
          subject: opts.subject,
          html: opts.html,
        }),
      });
      if (res.ok) {
        status = "SENT";
      } else {
        status = "FAILED";
        error = `Resend ${res.status}: ${(await res.text()).slice(0, 500)}`;
      }
    } catch (e) {
      status = "FAILED";
      error = e instanceof Error ? e.message : String(e);
    }
  } else {
    console.log(`[email:${opts.template}] to=${opts.to} subject="${opts.subject}"`);
  }

  try {
    await prisma.emailLog.create({
      data: {
        to: opts.to,
        subject: opts.subject,
        template: opts.template,
        status,
        error,
        meta: (opts.meta ?? {}) as object,
      },
    });
  } catch {
    // Logging must never take down the calling flow.
  }
  return status !== "FAILED";
}

// ---------------------------------------------------------------------------
// Branded layout — inline styles only (email clients ignore stylesheets).
// ---------------------------------------------------------------------------

const site = () => process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export function emailLayout(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#0b1622;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0b1622;padding:24px 0;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#101f30;border-radius:16px;overflow:hidden;border:1px solid #1d3349;">
  <tr><td style="background:linear-gradient(90deg,#0e7f8f,#14b5c8,#f4735c);padding:2px;"></td></tr>
  <tr><td style="padding:28px 32px 8px;">
    <span style="font-size:22px;font-weight:800;letter-spacing:-0.5px;">
      <span style="color:#2dd4e4;">Aqua</span><span style="color:#f4735c;">Vida</span><span style="color:#64748b;font-size:12px;">365</span>
    </span>
  </td></tr>
  <tr><td style="padding:8px 32px 0;">
    <h1 style="margin:0;font-size:20px;color:#e2e8f0;">${title}</h1>
  </td></tr>
  <tr><td style="padding:16px 32px 28px;color:#94a3b8;font-size:14px;line-height:1.6;">
    ${bodyHtml}
  </td></tr>
  <tr><td style="padding:18px 32px;border-top:1px solid #1d3349;color:#64748b;font-size:12px;">
    AquaVida365 · Premium corals &amp; saltwater livestock · Overnight shipping, live-arrival guarantee<br/>
    <a href="${site()}" style="color:#2dd4e4;text-decoration:none;">${site().replace(/^https?:\/\//, "")}</a>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

export function emailButton(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0;"><tr><td style="border-radius:999px;background:#14b5c8;">
    <a href="${href}" style="display:inline-block;padding:12px 28px;color:#06121d;font-weight:bold;text-decoration:none;font-size:14px;">${label}</a>
  </td></tr></table>`;
}
