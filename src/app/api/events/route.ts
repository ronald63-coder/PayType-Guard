import { listEvents } from "@/lib/store";
import { ok } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const orderId = new URL(req.url).searchParams.get("orderId") ?? undefined;
  return ok({ events: listEvents(orderId) });
}
