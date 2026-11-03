import { signProfile, validateProfile } from "@/lib/profile";
import { bad, ok } from "@/lib/http";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const v = validateProfile(body);
  if (!v.ok) return bad(v.error);
  return ok({ token: signProfile(v.value) });
}
