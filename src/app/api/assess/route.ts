import { assess, validateInput } from "@/lib/assess";
import { verifyProfile } from "@/lib/profile";
import { bad, ok } from "@/lib/http";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const v = validateInput(body);
  if (!v.ok) return bad(v.error);
  let profile = null;
  if (body?.profileToken) {
    profile = verifyProfile(String(body.profileToken));
    if (!profile) return bad("This readiness link is invalid or has been altered.");
  }
  return ok(await assess(v.value, profile));
}
