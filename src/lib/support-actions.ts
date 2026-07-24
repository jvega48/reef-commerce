"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { ticketReplyEmail } from "@/lib/email-templates";
import type { Role, TicketStatus, TicketTopic } from "@/generated/prisma/client";

const SUPPORT_ROLES: Role[] = ["OWNER", "ADMIN", "SUPPORT", "SHIPPING_MANAGER"];

const TOPICS: TicketTopic[] = [
  "ORDER_ISSUE", "DOA_CLAIM", "SHIPPING", "PRODUCT_QUESTION",
  "WHOLESALE", "DISTRIBUTOR", "ACCOUNT", "OTHER",
];

// In-memory per-email throttle for ticket creation (guest contact form is a
// spam magnet). Single-instance scope, same trade-off as the login limiter.
const ticketTimestamps = new Map<string, number[]>();
function isTicketRateLimited(email: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000;
  const list = (ticketTimestamps.get(email) ?? []).filter((t) => now - t < windowMs);
  if (list.length >= 5) return true;
  list.push(now);
  ticketTimestamps.set(email, list);
  return false;
}

// ---------------------------------------------------------------------------
// Create (signed-in customers and guests via contact form)
// ---------------------------------------------------------------------------

export async function createTicket(formData: FormData) {
  const session = await auth();
  const fromContact = formData.get("fromContact") === "1";

  const email = (
    session?.user?.email ??
    String(formData.get("email") ?? "")
  ).toLowerCase().trim();
  const name = String(formData.get("name") ?? "").trim() || session?.user?.name || null;
  const subject = String(formData.get("subject") ?? "").trim().slice(0, 200);
  const body = String(formData.get("body") ?? "").trim().slice(0, 8000);
  const topic = TOPICS.find((t) => t === String(formData.get("topic"))) ?? "OTHER";
  const orderId = String(formData.get("orderId") ?? "").trim() || null;

  // Public inquiry forms live on several pages — bounce back to the one used.
  const publicBack =
    topic === "WHOLESALE" ? "/wholesale" :
    topic === "DISTRIBUTOR" ? "/distributors" : "/contact";
  const back = fromContact ? publicBack : "/account/support";
  if (!email || !subject || !body) redirect(`${back}?error=missing`);
  // Honeypot field: bots fill every input — humans never see this one.
  if (String(formData.get("website") ?? "")) redirect(`${back}?sent=1`);
  if (isTicketRateLimited(email)) redirect(`${back}?error=ratelimit`);

  // Only attach an order the requester actually owns.
  let validOrderId: string | null = null;
  if (orderId) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (
      order &&
      (order.userId === session?.user?.id ||
        order.email.toLowerCase() === email)
    ) {
      validOrderId = order.id;
    }
  }

  const ticket = await prisma.supportTicket.create({
    data: {
      userId: session?.user?.id,
      email,
      name,
      subject,
      topic,
      orderId: validOrderId,
      status: "OPEN",
      messages: {
        create: {
          authorId: session?.user?.id,
          fromStaff: false,
          body,
        },
      },
    },
  });

  revalidatePath("/admin/support");
  if (fromContact) redirect(`${publicBack}?sent=1`);
  redirect(`/account/support/${ticket.id}`);
}

// ---------------------------------------------------------------------------
// Replies
// ---------------------------------------------------------------------------

export async function customerReply(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/login?next=/account/support");
  const ticketId = String(formData.get("ticketId") ?? "");
  const body = String(formData.get("body") ?? "").trim().slice(0, 8000);
  if (!ticketId || !body) return;

  const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
  const owns =
    ticket &&
    (ticket.userId === session.user.id ||
      ticket.email.toLowerCase() === session.user.email?.toLowerCase());
  if (!owns) return;

  await prisma.$transaction([
    prisma.ticketMessage.create({
      data: { ticketId, authorId: session.user.id, fromStaff: false, body },
    }),
    prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        status:
          ticket.status === "RESOLVED" || ticket.status === "CLOSED"
            ? "OPEN" // customer reopening a closed thread
            : "AWAITING_SUPPORT",
      },
    }),
  ]);
  revalidatePath(`/account/support/${ticketId}`);
  revalidatePath("/admin/support");
}

export async function staffReply(formData: FormData) {
  const session = await auth();
  if (!session?.user || !SUPPORT_ROLES.includes(session.user.role)) {
    throw new Error("Not authorized for support");
  }
  const ticketId = String(formData.get("ticketId") ?? "");
  const body = String(formData.get("body") ?? "").trim().slice(0, 8000);
  const resolve = formData.get("resolve") === "on";
  if (!ticketId || !body) return;

  const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
  if (!ticket) return;

  await prisma.$transaction([
    prisma.ticketMessage.create({
      data: { ticketId, authorId: session.user.id, fromStaff: true, body },
    }),
    prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status: resolve ? "RESOLVED" : "AWAITING_CUSTOMER" },
    }),
  ]);

  const tpl = ticketReplyEmail({
    number: ticket.number,
    subject: ticket.subject,
    reply: body,
  });
  await sendEmail({
    to: ticket.email,
    ...tpl,
    template: "ticket-reply",
    meta: { ticketId },
  });

  revalidatePath(`/admin/support/${ticketId}`);
  revalidatePath("/admin/support");
  revalidatePath(`/account/support/${ticketId}`);
}

export async function setTicketStatus(formData: FormData) {
  const session = await auth();
  if (!session?.user || !SUPPORT_ROLES.includes(session.user.role)) {
    throw new Error("Not authorized for support");
  }
  const ticketId = String(formData.get("ticketId") ?? "");
  const status = (
    ["OPEN", "AWAITING_CUSTOMER", "AWAITING_SUPPORT", "RESOLVED", "CLOSED"] as TicketStatus[]
  ).find((s) => s === String(formData.get("status")));
  if (!ticketId || !status) return;

  await prisma.supportTicket.update({ where: { id: ticketId }, data: { status } });
  revalidatePath(`/admin/support/${ticketId}`);
  revalidatePath("/admin/support");
}
