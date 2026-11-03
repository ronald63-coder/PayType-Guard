import { signAsk, validateAsk } from "@/lib/profile";
import { bad, ok } from "@/lib/http";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const validated = validateAsk(body);
  if (!validated.ok) return bad(validated.error);
  return ok({ token: signAsk(validated.value) });
}
