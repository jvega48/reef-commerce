import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Liveness + readiness probe. Checks DB connectivity and reports which
// optional integrations are wired. Returns 503 if the database is unreachable
// so load balancers / uptime monitors can react.

export const dynamic = "force-dynamic";

export async function GET() {
  const started = Date.now();
  let dbOk = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch {
    dbOk = false;
  }

  const integrations = {
    stripe: Boolean(process.env.STRIPE_SECRET_KEY),
    stripeWebhook: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
    email: Boolean(process.env.RESEND_API_KEY),
    shipping: Boolean(process.env.SHIPPO_API_KEY || process.env.EASYPOST_API_KEY),
    storage: Boolean(process.env.R2_BUCKET),
    cron: Boolean(process.env.CRON_SECRET),
  };

  return NextResponse.json(
    {
      status: dbOk ? "ok" : "degraded",
      database: dbOk ? "up" : "down",
      integrations,
      uptimeMs: Math.round(process.uptime() * 1000),
      responseMs: Date.now() - started,
      timestamp: new Date().toISOString(),
    },
    {
      status: dbOk ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
