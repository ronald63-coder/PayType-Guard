import { draftAppeal, interpretNotice } from "@/lib/appeal";
import { SOURCES } from "@/lib/knowledge";
import { bad, ok } from "@/lib/http";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const notice = String(body?.notice ?? "").trim();
  const evidence = String(body?.evidence ?? "").trim();
  const name = String(body?.name ?? "").trim().slice(0, 80);
  if (notice.length < 10) return bad("Paste the restriction notice first.");
  if (notice.length > 4000 || evidence.length > 4000) return bad("Text is too long (4000 characters max).");

  const interpretation = interpretNotice(notice);
  if (body?.stage === "interpret") return ok({ interpretation, resolutionCenter: SOURCES.resolution.url });

  const { draft, origin } = await draftAppeal(notice, evidence, name);
  return ok({ interpretation, draft, origin, resolutionCenter: SOURCES.resolution.url });
}
