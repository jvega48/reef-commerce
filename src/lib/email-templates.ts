import { emailLayout, emailButton } from "./email";

// ---------------------------------------------------------------------------
// Concrete transactional emails. Each returns { subject, html } for sendEmail.
// Money values arrive pre-formatted strings so templates stay dumb.
// ---------------------------------------------------------------------------

const site = () => process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

type Line = { name: string; quantity: number; price: string };

function itemRows(items: Line[]): string {
  return items
    .map(
      (i) => `<tr>
        <td style="padding:6px 0;color:#cbd5e1;">${i.name}</td>
        <td style="padding:6px 0;color:#64748b;text-align:center;">×${i.quantity}</td>
        <td style="padding:6px 0;color:#2dd4e4;text-align:right;">${i.price}</td>
      </tr>`,
    )
    .join("");
}

export function orderConfirmationEmail(o: {
  orderNumber: number;
  items: Line[];
  total: string;
  isPickup: boolean;
}) {
  return {
    subject: `Order #${o.orderNumber} confirmed — AquaVida365`,
    html: emailLayout(
      `Thanks for your order! 🪸`,
      `<p>Your order <strong style="color:#e2e8f0;">#${o.orderNumber}</strong> is confirmed.
       ${o.isPickup ? "We'll text you when it's ready for local pickup." : "Live orders ship overnight on our next Tuesday or Wednesday ship day — you'll get tracking the moment the label prints."}</p>
       <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:12px 0;border-top:1px solid #1d3349;border-bottom:1px solid #1d3349;">
         ${itemRows(o.items)}
       </table>
       <p style="text-align:right;font-size:16px;color:#e2e8f0;">Total: <strong style="color:#2dd4e4;">${o.total}</strong></p>
       ${emailButton(`${site()}/account/orders`, "View your order")}
       <p style="font-size:12px;">Every specimen is covered by our live-arrival guarantee. Unbox on camera within 2 hours of delivery for DOA claims.</p>`,
    ),
  };
}

export function shipmentEmail(o: {
  orderNumber: number;
  carrier: string;
  trackingNumber: string;
  trackingUrl: string | null;
}) {
  return {
    subject: `Order #${o.orderNumber} has shipped — arriving tomorrow`,
    html: emailLayout(
      `Your reef pack is on the way! 🚚`,
      `<p>Order <strong style="color:#e2e8f0;">#${o.orderNumber}</strong> just left our facility
       via <strong style="color:#e2e8f0;">${o.carrier}</strong> overnight.</p>
       <p>Tracking number: <strong style="color:#2dd4e4;font-family:monospace;">${o.trackingNumber}</strong></p>
       ${o.trackingUrl ? emailButton(o.trackingUrl, "Track your package") : ""}
       <p><strong style="color:#f4735c;">Important:</strong> live animals are inside. Please be home to receive the box,
       and acclimate within 2 hours of arrival. Film your unboxing — it's required for any live-arrival claim.</p>`,
    ),
  };
}

export function orderStatusEmail(o: { orderNumber: number; statusLabel: string; note?: string }) {
  return {
    subject: `Order #${o.orderNumber}: ${o.statusLabel}`,
    html: emailLayout(
      `Order update`,
      `<p>Your order <strong style="color:#e2e8f0;">#${o.orderNumber}</strong> is now
       <strong style="color:#2dd4e4;">${o.statusLabel}</strong>.</p>
       ${o.note ? `<p>${o.note}</p>` : ""}
       ${emailButton(`${site()}/account/orders`, "View order status")}`,
    ),
  };
}

export function refundEmail(o: { orderNumber: number; amount: string; reason?: string | null }) {
  return {
    subject: `Refund issued for order #${o.orderNumber}`,
    html: emailLayout(
      `Your refund is on the way`,
      `<p>We've issued a refund of <strong style="color:#2dd4e4;">${o.amount}</strong> for order
       <strong style="color:#e2e8f0;">#${o.orderNumber}</strong>.</p>
       ${o.reason ? `<p>Reason: ${o.reason}</p>` : ""}
       <p>Depending on your bank, it can take 5–10 business days to appear on your statement.</p>`,
    ),
  };
}

export function passwordResetEmail(link: string) {
  return {
    subject: "Reset your AquaVida365 password",
    html: emailLayout(
      `Reset your password`,
      `<p>Someone (hopefully you) requested a password reset for this email address.
       The link below is valid for 1 hour and can be used once.</p>
       ${emailButton(link, "Choose a new password")}
       <p style="font-size:12px;">Didn't request this? You can safely ignore this email — your password is unchanged.</p>`,
    ),
  };
}

export function giftCardEmail(g: {
  code: string;
  amount: string;
  recipientName?: string | null;
  fromName?: string | null;
  message?: string | null;
}) {
  return {
    subject: `You've received a ${g.amount} AquaVida365 gift card! 🎁`,
    html: emailLayout(
      `A gift from the reef${g.fromName ? ` — sent by ${g.fromName}` : ""}`,
      `<p>${g.recipientName ? `Hi ${g.recipientName}, ` : ""}you've been sent an AquaVida365 gift card
       worth <strong style="color:#2dd4e4;">${g.amount}</strong>.</p>
       ${g.message ? `<blockquote style="margin:12px 0;padding:10px 16px;border-left:3px solid #f4735c;color:#cbd5e1;">${g.message}</blockquote>` : ""}
       <p style="text-align:center;margin:20px 0;">
         <span style="display:inline-block;padding:14px 24px;border:2px dashed #14b5c8;border-radius:12px;font-family:monospace;font-size:20px;letter-spacing:2px;color:#2dd4e4;">${g.code}</span>
       </p>
       <p>Enter this code at checkout — it never loses value until it's spent.</p>
       ${emailButton(`${site()}/shop`, "Start shopping")}`,
    ),
  };
}

export function abandonedCartEmail(o: { items: Line[]; resumeUrl: string }) {
  return {
    subject: "Your reef picks are still waiting 🪸",
    html: emailLayout(
      `Forgot something?`,
      `<p>The specimens in your cart are still available — but livestock moves fast,
       and WYSIWYG frags are one of a kind.</p>
       <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:12px 0;border-top:1px solid #1d3349;border-bottom:1px solid #1d3349;">
         ${itemRows(o.items)}
       </table>
       ${emailButton(o.resumeUrl, "Resume your order")}
       <p style="font-size:12px;">Orders over $350 ship free. Every animal is covered by our live-arrival guarantee.</p>`,
    ),
  };
}

export function ticketReplyEmail(t: { number: number; subject: string; reply: string }) {
  return {
    subject: `Re: [Ticket #${t.number}] ${t.subject}`,
    html: emailLayout(
      `Support replied to your ticket`,
      `<p style="white-space:pre-line;color:#cbd5e1;">${t.reply}</p>
       ${emailButton(`${site()}/account/support`, "View conversation")}
       <p style="font-size:12px;">Reply from your account page and we'll get right back to you.</p>`,
    ),
  };
}

export function restockEmail(p: { name: string; slug: string }) {
  return {
    subject: `Back in stock: ${p.name}`,
    html: emailLayout(
      `It's back! 🎉`,
      `<p><strong style="color:#e2e8f0;">${p.name}</strong> just came back in stock.
       These usually don't last long.</p>
       ${emailButton(`${site()}/product/${p.slug}`, "Grab it now")}`,
    ),
  };
}

export function welcomeEmail(o: { name?: string | null; referralCode: string }) {
  return {
    subject: "Welcome to the reef 🌊 — your account is ready",
    html: emailLayout(
      `Welcome${o.name ? `, ${o.name}` : ""}!`,
      `<p>Your AquaVida365 account is live. You'll earn <strong style="color:#2dd4e4;">1 Reef Point per $1</strong>
       on every order, and your wishlist syncs across devices.</p>
       <p>Share your referral link — friends get a warm welcome, you get
       <strong style="color:#2dd4e4;">500 Reef Points</strong> when they place a first order:</p>
       <p style="font-family:monospace;color:#2dd4e4;">${site()}/register?ref=${o.referralCode}</p>
       ${emailButton(`${site()}/shop`, "Explore the reef")}`,
    ),
  };
}
