import { createOrder, paypalConfigured } from "@/lib/paypal";
import { validateInput } from "@/lib/assess";
import { bad, ok } from "@/lib/http";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  // Financial execution needs explicit user authorization.
  if (body?.acknowledged !== true) return bad("Review the consequences and authorize the payment first.", 403);
  const v = validateInput(body);
  if (!v.ok) return bad(v.error);
  if (!paypalConfigured()) return bad("PayPal Sandbox credentials are missing on the server.", 500);
  try {
    const order = await createOrder(v.value);
    return ok({ id: order.id });
  } catch (e: any) {
    return bad(e.message ?? "Could not create the order.", 502);
  }
}
