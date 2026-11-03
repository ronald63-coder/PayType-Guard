import { statusFromEventType, verifyWebhook } from "@/lib/paypal";
import { addEvent } from "@/lib/store";
import { bad, ok } from "@/lib/http";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
  const raw = await req.text();
  const verified = await verifyWebhook(req.headers, raw);
  // Unverified events are rejected: only PayPal-signed events may drive the agent.
  if (!verified) return bad("Signature verification failed.", 401);

  const evt = JSON.parse(raw);
  const res = evt?.resource ?? {};
  const isOrderEvent = String(evt.event_type ?? "").startsWith("CHECKOUT.ORDER");
  const orderId: string = isOrderEvent ? res?.id : res?.supplementary_data?.related_ids?.order_id ?? res?.id ?? "unknown";
  addEvent({
    id: evt.id ?? randomUUID(),
    orderId,
    status: statusFromEventType(evt.event_type),
    eventType: evt.event_type,
    amount: res?.amount?.value ?? res?.purchase_units?.[0]?.amount?.value,
    currency: res?.amount?.currency_code ?? res?.purchase_units?.[0]?.amount?.currency_code,
    origin: "webhook",
    signatureVerified: true,
    receivedAt: new Date().toISOString(),
  });
  return ok({ received: true });
}
