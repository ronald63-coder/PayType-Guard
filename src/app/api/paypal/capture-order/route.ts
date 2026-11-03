import { captureOrder, statusFromCapture } from "@/lib/paypal";
import { addEvent } from "@/lib/store";
import { bad, ok } from "@/lib/http";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const orderId = String(body?.orderId ?? "");
  if (!/^[A-Za-z0-9-]{5,40}$/.test(orderId)) return bad("Invalid order id.");
  try {
    const order = await captureOrder(orderId);
    const s = statusFromCapture(order);
    addEvent({
      id: randomUUID(),
      orderId,
      status: s.status,
      eventType: "CAPTURE_RESPONSE",
      amount: s.amount,
      currency: s.currency,
      origin: "capture-response",
      signatureVerified: true, // direct API response over TLS, not a webhook
      receivedAt: new Date().toISOString(),
    });
    return ok({ orderId, ...s });
  } catch (e: any) {
    return bad(e.message ?? "Capture failed.", 502);
  }
}
