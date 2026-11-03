import { describe, it, expect } from "vitest";
import { calcSellerFee } from "@/lib/fees";
import { analyzeIntentRules, checkMismatch, recommendedType } from "@/lib/intent";
import { validateInput } from "@/lib/assess";
import { interpretNotice } from "@/lib/appeal";
import { statusFromEventType } from "@/lib/paypal";

describe("fees", () => {
  it("computes the configured seller fee deterministically", () => {
    const f = calcSellerFee(500, "USD");
    expect(f.status).toBe("estimated");
    expect(f.fee).toBe(17.94); // 500 * 3.49% + 0.49
    expect(f.net).toBe(482.06);
  });
  it("refuses to guess for unconfigured currencies", () => {
    expect(calcSellerFee(100, "GBP").status).toBe("not_configured");
  });
});

describe("intent", () => {
  it("reads a freelance payment as commercial", () => {
    expect(analyzeIntentRules("Receiving $500 for designing a website").category).toBe("commercial");
  });
  it("reads a sibling transfer as personal", () => {
    expect(analyzeIntentRules("Sending money to my sister").category).toBe("personal");
  });
  it("treats repaying a friend as potentially personal with lower confidence", () => {
    const r = analyzeIntentRules("Repaying a friend for dinner");
    expect(r.category).toBe("personal");
    expect(r.confidence).toBeLessThan(0.7);
  });
  it("is ambiguous when there are no signals", () => {
    expect(analyzeIntentRules("stuff").category).toBe("ambiguous");
  });
  it("flags F&F selected for a commercial payment and never suggests dodging", () => {
    const intent = analyzeIntentRules("Paying a freelancer for a logo");
    const m = checkMismatch(intent, "FF");
    expect(m.hasMismatch).toBe(true);
    expect(recommendedType(intent)).toBe("GS");
  });
});

describe("validation", () => {
  it("rejects bad input", () => {
    expect(validateInput({ amount: -1, currency: "USD", description: "abc", selectedType: "GS" }).ok).toBe(false);
    expect(validateInput({ amount: 5, currency: "KES", description: "abc", selectedType: "GS" }).ok).toBe(false);
    expect(validateInput({ amount: 20000, currency: "USD", description: "abc", selectedType: "GS" }).ok).toBe(false);
  });
  it("accepts good input", () => {
    expect(validateInput({ amount: 10.255, currency: "usd", description: "logo work", selectedType: "GS" }).ok).toBe(true);
  });
});

describe("appeal + events", () => {
  it("identifies verification requests", () => {
    expect(interpretNotice("Please confirm your identity to restore access.").kind).toBe("verification");
  });
  it("maps webhook event types", () => {
    expect(statusFromEventType("PAYMENT.CAPTURE.PENDING")).toBe("PENDING");
    expect(statusFromEventType("SOMETHING.ELSE")).toBe("UNKNOWN");
  });
});

import { signProfile, verifyProfile, validateProfile } from "@/lib/profile";
import { recipientReadiness } from "@/lib/assess";

describe("recipient readiness", () => {
  const mk = (over: any = {}) => {
    const v = validateProfile({ name: "Ronny", accountType: "personal", setupComplete: true, ...over });
    if (!v.ok) throw new Error(v.error);
    return v.value;
  };
  it("round-trips a signed profile and rejects tampering", () => {
    const token = signProfile(mk());
    expect(verifyProfile(token)?.name).toBe("Ronny");
    const [body, sig] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ ...mk(), accountType: "business" })).toString("base64url");
    expect(verifyProfile(`${forged}.${sig}`)).toBeNull();
    expect(verifyProfile(`${body}.x${sig}`)).toBeNull();
    expect(verifyProfile("garbage")).toBeNull();
  });
  it("warns when a commercial payment targets a personal account", () => {
    const r = recipientReadiness(mk(), analyzeIntentRules("Paying for website design"), "GS");
    expect(r.readiness).toBe("caution");
    expect(r.actions.join(" ")).toMatch(/invoice/i);
  });
  it("is ready for a commercial payment to a finished business account", () => {
    const r = recipientReadiness(mk({ accountType: "business" }), analyzeIntentRules("Paying for website design"), "GS");
    expect(r.readiness).toBe("ready");
  });
  it("cautions when setup is incomplete", () => {
    const r = recipientReadiness(mk({ accountType: "business", setupComplete: false }), analyzeIntentRules("Paying for a logo"), "GS");
    expect(r.readiness).toBe("caution");
  });
  it("never tells the sender to switch to personal to dodge a hold", () => {
    const r = recipientReadiness(mk(), analyzeIntentRules("Paying for website design"), "GS");
    expect(JSON.stringify(r)).not.toMatch(/friends|family|personal transfer instead/i);
  });
  it("rejects invalid profiles", () => {
    expect(validateProfile({ name: "R", accountType: "personal", setupComplete: true }).ok).toBe(false);
    expect(validateProfile({ name: "Ronny", accountType: "x", setupComplete: true }).ok).toBe(false);
  });
});

import { senderGuidance } from "@/lib/assess";

describe("sender guidance", () => {
  const g = (text: string, sel: "GS" | "FF", profile?: any) => {
    const intent = analyzeIntentRules(text);
    const rec = profile ? recipientReadiness(profile, intent, sel) : undefined;
    return senderGuidance(intent, sel, checkMismatch(intent, sel), rec);
  };
  const personalAcct = { name: "Ronny", accountType: "personal", setupComplete: true, createdAt: "x" };

  it("tells the sender to switch F&F to G&S for paid work", () => {
    const r = g("Paying a freelancer for a logo", "FF");
    expect(r.verdict).toBe("change_type");
    expect(r.switchTo).toBe("GS");
  });
  it("tells the sender to switch G&S to F&F for a personal gift", () => {
    const r = g("Sending money to my sister for her birthday", "GS");
    expect(r.verdict).toBe("change_type");
    expect(r.switchTo).toBe("FF");
  });
  it("keeps G&S and points at the recipient when the account is the risk", () => {
    const r = g("Paying for website design", "GS", personalAcct);
    expect(r.verdict).toBe("fix_first");
    expect(r.switchTo).toBeUndefined();
    expect(r.detail).toMatch(/won't help/i);
  });
  it("never recommends Friends & Family for a commercial payment", () => {
    for (const sel of ["GS", "FF"] as const) {
      const r = g("Paying for website design", sel, personalAcct);
      expect(r.switchTo).not.toBe("FF");
    }
  });
  it("sends as is when nothing clashes", () => {
    expect(g("Paying for website design", "GS").verdict).toBe("send_as_is");
  });
});
