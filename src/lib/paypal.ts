import { randomUUID } from "crypto";
import type { TxnStatus } from "./types";

// Sandbox only. Live funds are out of scope for this MVP, so the base URL is fixed.
const BASE = "https://api-m.sandbox.paypal.com";

let cached: { token: string; exp: number } | null = null;

export function paypalConfigured() {
  return Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
}

async function accessToken(): Promise<string> {
  if (cached && cached.exp > Date.now() + 30_000) return cached.token;
  const id = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!id || !secret) throw new Error("PayPal Sandbox credentials are not configured.");
  const res = await fetch(`${BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${id}:${secret}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`PayPal auth failed (${res.status}).`);
  const data = await res.json();
  cached = { token: data.access_token, exp: Date.now() + data.expires_in * 1000 };
  return cached.token;
}

async function api(path: string, init: RequestInit & { requestId?: string } = {}) {
  const token = await accessToken();
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.requestId ? { "PayPal-Request-Id": init.requestId } : {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = body?.message || body?.name || `PayPal error ${res.status}`;
    throw new Error(msg);
  }
  return body;
}

export async function createOrder(p: { amount: number; currency: string; description: string }) {
  return api("/v2/checkout/orders", {
    method: "POST",
    requestId: randomUUID(),
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          description: p.description.slice(0, 127),
          amount: { currency_code: p.currency, value: p.amount.toFixed(2) },
        },
      ],
    }),
  });
}

export async function captureOrder(orderId: string) {
  return api(`/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
    method: "POST",
    requestId: randomUUID(),
    body: "{}",
  });
}

export function statusFromCapture(order: any): { status: TxnStatus; amount?: string; currency?: string } {
  const cap = order?.purchase_units?.[0]?.payments?.captures?.[0];
  const map: Record<string, TxnStatus> = {
    COMPLETED: "COMPLETED",
    PENDING: "PENDING",
    DECLINED: "DENIED",
    FAILED: "DENIED",
    REFUNDED: "REFUNDED",
  };
  return {
    status: map[cap?.status] ?? "UNKNOWN",
    amount: cap?.amount?.value,
    currency: cap?.amount?.currency_code,
  };
}

export function statusFromEventType(eventType: string): TxnStatus {
  switch (eventType) {
    case "CHECKOUT.ORDER.APPROVED":
      return "APPROVED";
    case "PAYMENT.CAPTURE.COMPLETED":
      return "COMPLETED";
    case "PAYMENT.CAPTURE.PENDING":
      return "PENDING";
    case "PAYMENT.CAPTURE.DENIED":
      return "DENIED";
    case "PAYMENT.CAPTURE.REFUNDED":
      return "REFUNDED";
    default:
      return "UNKNOWN";
  }
}

/** Verifies a webhook with PayPal's verify-webhook-signature endpoint. */
export async function verifyWebhook(headers: Headers, rawBody: string): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) return false;
  try {
    const result = await api("/v1/notifications/verify-webhook-signature", {
      method: "POST",
      body: JSON.stringify({
        auth_algo: headers.get("paypal-auth-algo"),
        cert_url: headers.get("paypal-cert-url"),
        transmission_id: headers.get("paypal-transmission-id"),
        transmission_sig: headers.get("paypal-transmission-sig"),
        transmission_time: headers.get("paypal-transmission-time"),
        webhook_id: webhookId,
        webhook_event: JSON.parse(rawBody),
      }),
    });
    return result?.verification_status === "SUCCESS";
  } catch {
    return false;
  }
}
