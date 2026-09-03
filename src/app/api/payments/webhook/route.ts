import { NextResponse } from "next/server";
import { DEMO_MODE } from "@/lib/config";
import { confirmPayment, failPayment, FinanceError } from "@/lib/services/finance";
import { getPaymentProvider } from "@/lib/services/payment";

export const dynamic = "force-dynamic";

/**
 * Confirmation serveur des paiements (mode réel).
 * Le prestataire (ex. Wave) appelle cette URL ; la signature est vérifiée
 * avant tout traitement. Traitement idempotent (confirmPayment).
 */
export async function POST(req: Request) {
  if (DEMO_MODE) return NextResponse.json({ ok: false, error: "demo_mode" }, { status: 400 });
  const raw = await req.text();
  try {
    const event = getPaymentProvider().parseWebhook(raw, req.headers);
    if (event.kind === "payment.succeeded") {
      const r = await confirmPayment(event.reference, { source: "webhook", providerReference: event.providerReference });
      return NextResponse.json({ ok: true, result: r.status });
    }
    if (event.kind === "payment.failed") {
      await failPayment(event.reference, { providerReference: event.providerReference });
      return NextResponse.json({ ok: true, result: "failed" });
    }
    return NextResponse.json({ ok: true, result: "ignored" });
  } catch (e) {
    const status = e instanceof FinanceError ? 409 : 400;
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status });
  }
}
