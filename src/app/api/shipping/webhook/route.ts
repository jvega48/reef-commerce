import { NextResponse } from "next/server";
import { applyTrackingUpdate } from "@/lib/shipping";

// Shippo tracking webhook. Shippo does not HMAC-sign webhooks, so the endpoint
// is protected by a shared secret passed as a `?token=` query param — set the
// same value in SHIPPO_WEBHOOK_SECRET and in the Shippo dashboard webhook URL.
//
// Payload (event="track_updated"):
//   { event, data: { tracking_number, tracking_status: { status }, carrier } }
export async function POST(request: Request) {
  const secret = process.env.SHIPPO_WEBHOOK_SECRET;
  if (secret) {
    const url = new URL(request.url);
    if (url.searchParams.get("token") !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let body: {
    event?: string;
    data?: {
      tracking_number?: string;
      tracking_status?: { status?: string } | null;
    };
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Shippo sends a test ping and various events; only act on tracking updates.
  const trackingNumber = body.data?.tracking_number;
  const status = body.data?.tracking_status?.status;
  if (body.event === "track_updated" && trackingNumber && status) {
    await applyTrackingUpdate({ trackingNumber, shippoStatus: status });
  }

  return NextResponse.json({ received: true });
}
