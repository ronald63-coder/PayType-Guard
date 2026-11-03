import { addEvent } from "@/lib/store";
import { statusFromEventType } from "@/lib/paypal";
import { bad, ok } from "@/lib/http";
import { randomUUID } from "crypto";

const ALLOWED = ["PAYMENT.CAPTURE.COMPLETED", "PAYMENT.CAPTURE.PENDING", "PAYMENT.CAPTURE.DENIED", "PAYMENT.CAPTURE.REFUNDED"];

/** Demo helper for local dev when PayPal can't reach a webhook URL. Clearly labelled "simulation". */
export async function POST(req: Request) {
  if (process.env.ALLOW_SIMULATION !== "true") return bad("Simulation is disabled.", 403);
  const body = await req.json().catch(() => null);
  if (!ALLOWED.includes(body?.eventType)) return bad("Unsupported event type.");
  addEvent({
    id: randomUUID(),
    orderId: String(body.orderId ?? "SIMULATED").slice(0, 40),
    status: statusFromEventType(body.eventType),
    eventType: body.eventType,
    amount: body.amount ? String(body.amount) : undefined,
    currency: body.currency ? String(body.currency) : undefined,
    origin: "simulation",
    signatureVerified: false,
    receivedAt: new Date().toISOString(),
  });
  return ok({ simulated: true });
}
