import { guidanceWithNarrative } from "@/lib/advice";
import { bad, ok } from "@/lib/http";
import type { TxnStatus } from "@/lib/types";

const STATUSES: TxnStatus[] = ["APPROVED", "COMPLETED", "PENDING", "DENIED", "REFUNDED", "UNKNOWN"];

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const status = body?.status as TxnStatus;
  if (!STATUSES.includes(status)) return bad("Unknown status.");
  return ok(await guidanceWithNarrative(status, { amount: body?.amount, currency: body?.currency }));
}
