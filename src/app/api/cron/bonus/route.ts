import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { accrueBonuses } from "@/lib/services/finance";

export const dynamic = "force-dynamic";

/** Job planifié (ex. toutes les heures) : Authorization: Bearer CRON_SECRET */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  const provided = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!secret || provided.length !== secret.length || !timingSafeEqual(Buffer.from(provided), Buffer.from(secret))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const result = await accrueBonuses({ limit: 5000 });
  return NextResponse.json({ ok: true, ...result });
}

export const GET = POST;
