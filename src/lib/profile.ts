import { createHmac, timingSafeEqual } from "crypto";
import type { RecipientProfile } from "./types";

/**
 * Recipient readiness profiles are self-declared and travel inside a signed link, so no database is
 * needed and the sender can't alter what the recipient declared. Anyone holding the link can read it:
 * it only contains what the recipient chose to enter (never PayPal credentials or account data).
 */
const secret = () => process.env.PROFILE_SECRET || "dev-only-secret-change-me";
const sign = (body: string) => createHmac("sha256", secret()).update(body).digest("base64url");

export function signProfile(p: RecipientProfile): string {
  const body = Buffer.from(JSON.stringify(p)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function verifyProfile(token: string): RecipientProfile | null {
  const [body, sig] = String(token ?? "").split(".");
  if (!body || !sig) return null;
  const expected = sign(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    return validateProfile(p, true).ok ? (p as RecipientProfile) : null;
  } catch {
    return null;
  }
}

export function validateProfile(
  raw: any,
  keepCreatedAt = false
): { ok: true; value: RecipientProfile } | { ok: false; error: string } {
  const name = String(raw?.name ?? "").trim();
  const accountType = raw?.accountType;
  const note = String(raw?.note ?? "").trim();
  if (name.length < 2 || name.length > 60) return { ok: false, error: "Enter a name between 2 and 60 characters." };
  if (!["personal", "business", "unsure"].includes(accountType)) return { ok: false, error: "Choose an account type." };
  if (typeof raw?.setupComplete !== "boolean") return { ok: false, error: "Say whether account setup is complete." };
  if (note.length > 200) return { ok: false, error: "Keep the note under 200 characters." };
  return {
    ok: true,
    value: {
      name,
      accountType,
      setupComplete: raw.setupComplete,
      ...(note ? { note } : {}),
      createdAt: keepCreatedAt && raw.createdAt ? String(raw.createdAt) : new Date().toISOString(),
    },
  };
}
