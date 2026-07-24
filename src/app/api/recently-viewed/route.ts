import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { RV_COOKIE, RV_MAX } from "@/lib/recently-viewed";

// Called by the product page's <RecordView /> on mount. Keeps a rolling list
// of the last N product slugs in an httpOnly cookie.

export async function POST(req: NextRequest) {
  let slug = "";
  try {
    slug = String((await req.json())?.slug ?? "");
  } catch {
    /* ignore malformed body */
  }
  // Slugs are lowercase kebab-case; reject anything else outright.
  if (!/^[a-z0-9-]{1,120}$/.test(slug)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const jar = await cookies();
  let list: string[] = [];
  try {
    const parsed = JSON.parse(jar.get(RV_COOKIE)?.value ?? "[]");
    if (Array.isArray(parsed)) {
      list = parsed.filter((s): s is string => typeof s === "string");
    }
  } catch {
    /* start fresh on corrupt cookie */
  }

  list = [slug, ...list.filter((s) => s !== slug)].slice(0, RV_MAX);
  jar.set(RV_COOKIE, JSON.stringify(list), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return NextResponse.json({ ok: true });
}
