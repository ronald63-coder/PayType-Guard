import { describe, expect, it } from "vitest";
import { signAsk, signProfile, validateAsk, validateProfile, verifyAsk, verifyProfile } from "@/lib/profile";

describe("sender readiness requests", () => {
  it("validates and round-trips the sender, amount, currency, and purpose", () => {
    const result = validateAsk({
      senderName: "Amina",
      amount: "125.50",
      currency: "usd",
      purpose: "Website design",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const request = verifyAsk(signAsk(result.value));
    expect(request).toMatchObject({
      kind: "ask",
      senderName: "Amina",
      amount: 125.5,
      currency: "USD",
      purpose: "Website design",
    });
  });

  it("rejects altered tokens and tokens signed for recipient profiles", () => {
    const ask = validateAsk({ senderName: "Amina", amount: "50" });
    const profile = validateProfile({ name: "Ronny", accountType: "personal", setupComplete: true });
    if (!ask.ok || !profile.ok) throw new Error("Test fixtures should be valid.");

    const token = signAsk(ask.value);
    const [body, signature] = token.split(".");
    const altered = Buffer.from(JSON.stringify({ ...ask.value, amount: 500 })).toString("base64url");
    expect(verifyAsk(`${altered}.${signature}`)).toBeNull();
    expect(verifyAsk(signProfile(profile.value))).toBeNull();
    expect(verifyProfile(token)).toBeNull();
    expect(verifyAsk("invalid")).toBeNull();
  });

  it("validates optional fields and rejects invalid amounts, currencies, and lengths", () => {
    expect(validateAsk({ senderName: "Amina" }).ok).toBe(true);
    expect(validateAsk({ senderName: "A" }).ok).toBe(false);
    expect(validateAsk({ senderName: "Amina", amount: -1 }).ok).toBe(false);
    expect(validateAsk({ senderName: "Amina", amount: 10001 }).ok).toBe(false);
    expect(validateAsk({ senderName: "Amina", currency: "KES" }).ok).toBe(false);
    expect(validateAsk({ senderName: "Amina", purpose: "x".repeat(201) }).ok).toBe(false);
  });
});
