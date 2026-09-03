import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { DEMO_MODE, appUrl } from "@/lib/config";

/* ------------------------------------------------------------------ */
/* Abstraction PaymentService                                          */
/*                                                                     */
/* Permet de brancher un vrai prestataire (Wave, Orange Money, …) sans  */
/* réécrire l'application. Le PIN de l'utilisateur n'est JAMAIS demandé */
/* ni stocké : le paiement se fait chez le prestataire, et la           */
/* confirmation arrive côté serveur (webhook signé ou vérification API). */
/* ------------------------------------------------------------------ */

export type ProviderName = "demo" | "wave";

export type InitiatePaymentInput = {
  reference: string;
  amount: number;
  currency: string;
  userId: string;
  phone?: string;
  description?: string;
};

export type InitiatePaymentResult = {
  /** URL vers laquelle rediriger l'utilisateur (mode réel). */
  checkoutUrl?: string;
  providerReference?: string;
};

export type PayoutInput = {
  withdrawalId: string;
  amount: number;
  currency: string;
  phone: string;
  method: string;
};

export type WebhookEvent =
  | { kind: "payment.succeeded"; reference: string; providerReference?: string; raw: unknown }
  | { kind: "payment.failed"; reference: string; providerReference?: string; raw: unknown }
  | { kind: "ignored"; raw: unknown };

export interface PaymentProvider {
  readonly name: ProviderName;
  readonly isDemo: boolean;
  initiate(input: InitiatePaymentInput): Promise<InitiatePaymentResult>;
  /** Vérifie l'état d'un paiement directement auprès du prestataire. */
  verify(reference: string): Promise<"paid" | "pending" | "failed">;
  /** Effectue un virement sortant (retrait) – à automatiser ultérieurement. */
  payout(input: PayoutInput): Promise<{ providerReference: string }>;
  /** Valide la signature d'un webhook et le transforme en événement normalisé. */
  parseWebhook(rawBody: string, headers: Headers): WebhookEvent;
}

/* ---------------- Fournisseur DÉMO ---------------- */
class DemoProvider implements PaymentProvider {
  readonly name = "demo" as const;
  readonly isDemo = true;

  async initiate(input: InitiatePaymentInput): Promise<InitiatePaymentResult> {
    return { checkoutUrl: appUrl(`/checkout/${input.reference}`), providerReference: `DEMO-${input.reference}` };
  }
  async verify(): Promise<"paid" | "pending" | "failed"> {
    // En démo, l'état est piloté par l'action serveur "simuler".
    return "pending";
  }
  async payout(input: PayoutInput): Promise<{ providerReference: string }> {
    return { providerReference: `DEMO-PAYOUT-${input.withdrawalId.slice(0, 8).toUpperCase()}` };
  }
  parseWebhook(rawBody: string): WebhookEvent {
    // Les webhooks ne sont pas utilisés en démo.
    return { kind: "ignored", raw: rawBody };
  }
}

/* ---------------- Fournisseur WAVE (Côte d'Ivoire) ---------------- */
/**
 * Implémentation basée sur l'API Wave Checkout
 * (https://developer.wave.com) : POST /v1/checkout/sessions renvoie une
 * `wave_launch_url` vers laquelle rediriger le client ; la confirmation
 * arrive via webhook `checkout.session.completed` signé (en-tête Wave-Signature).
 * Nécessite WAVE_API_KEY et WAVE_WEBHOOK_SECRET côté serveur uniquement.
 */
class WaveProvider implements PaymentProvider {
  readonly name = "wave" as const;
  readonly isDemo = false;
  private readonly apiKey = process.env.WAVE_API_KEY ?? "";
  private readonly webhookSecret = process.env.WAVE_WEBHOOK_SECRET ?? "";
  private readonly baseUrl = process.env.WAVE_API_URL ?? "https://api.wave.com";

  private assertConfigured() {
    if (!this.apiKey) throw new Error("WAVE_API_KEY is not configured");
  }

  async initiate(input: InitiatePaymentInput): Promise<InitiatePaymentResult> {
    this.assertConfigured();
    const res = await fetch(`${this.baseUrl}/v1/checkout/sessions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: String(input.amount),
        currency: input.currency,
        client_reference: input.reference,
        success_url: appUrl(`/checkout/${input.reference}?status=success`),
        error_url: appUrl(`/checkout/${input.reference}?status=error`),
      }),
    });
    if (!res.ok) throw new Error(`Wave checkout error: ${res.status}`);
    const data = (await res.json()) as { id: string; wave_launch_url: string };
    return { checkoutUrl: data.wave_launch_url, providerReference: data.id };
  }

  async verify(reference: string): Promise<"paid" | "pending" | "failed"> {
    this.assertConfigured();
    const res = await fetch(
      `${this.baseUrl}/v1/checkout/sessions/search?client_reference=${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${this.apiKey}` } },
    );
    if (!res.ok) return "pending";
    const data = (await res.json()) as { result?: Array<{ payment_status?: string; checkout_status?: string }> };
    const s = data.result?.[0];
    if (!s) return "pending";
    if (s.payment_status === "succeeded") return "paid";
    if (s.checkout_status === "expired" || s.payment_status === "cancelled") return "failed";
    return "pending";
  }

  async payout(): Promise<{ providerReference: string }> {
    // L'API Payout Wave (B2C) doit être activée contractuellement. Non branchée par défaut.
    throw new Error("Wave payout API is not configured – complete the withdrawal manually.");
  }

  parseWebhook(rawBody: string, headers: Headers): WebhookEvent {
    const sig = headers.get("wave-signature") ?? "";
    if (!this.webhookSecret || !sig) throw new Error("Missing webhook signature");
    const parts = Object.fromEntries(sig.split(",").map((p) => p.split("=") as [string, string]));
    const timestamp = parts["t"];
    const provided = parts["v1"];
    if (!timestamp || !provided) throw new Error("Malformed webhook signature");
    const expected = createHmac("sha256", this.webhookSecret).update(`${timestamp}${rawBody}`).digest("hex");
    const a = Buffer.from(expected);
    const b = Buffer.from(provided);
    if (a.length !== b.length || !timingSafeEqual(a, b)) throw new Error("Invalid webhook signature");

    const event = JSON.parse(rawBody) as {
      type: string;
      data: { id: string; client_reference?: string; payment_status?: string };
    };
    const reference = event.data.client_reference ?? "";
    if (event.type === "checkout.session.completed" && event.data.payment_status === "succeeded") {
      return { kind: "payment.succeeded", reference, providerReference: event.data.id, raw: event };
    }
    if (event.type === "checkout.session.payment_failed") {
      return { kind: "payment.failed", reference, providerReference: event.data.id, raw: event };
    }
    return { kind: "ignored", raw: event };
  }
}

/* ---------------- Sélection du fournisseur ---------------- */
export function getPaymentProvider(): PaymentProvider {
  if (DEMO_MODE) return new DemoProvider();
  const name = (process.env.PAYMENT_PROVIDER ?? "demo") as ProviderName;
  if (name === "wave") return new WaveProvider();
  return new DemoProvider();
}

export function isDemoMode(): boolean {
  return DEMO_MODE;
}

/** Référence unique lisible : NXT-YYYYMMDD-XXXXXX */
export function generatePaymentReference(): string {
  const d = new Date();
  const ymd = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `NXT-${ymd}-${rand}`;
}
