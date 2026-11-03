import { aiText } from "./ai";

export type RestrictionKind = "limitation" | "hold" | "verification" | "policy" | "unknown";

export function interpretNotice(notice: string) {
  const t = notice.toLowerCase();
  let kind: RestrictionKind = "unknown";
  if (/(verify|verification|confirm your identity|identity)/.test(t)) kind = "verification";
  else if (/(hold|held|release|available)/.test(t)) kind = "hold";
  else if (/(policy|violat|prohibited|restricted activity)/.test(t)) kind = "policy";
  else if (/(limit|limited|restrict|unusual activity|suspend)/.test(t)) kind = "limitation";

  const requests: Record<RestrictionKind, string[]> = {
    verification: ["Government-issued photo ID (as PayPal requests)", "Proof of address if requested", "Any document PayPal names in its notice"],
    hold: ["Proof of delivery or completed work", "Invoice or contract for the payment", "Communication with the buyer"],
    policy: ["Description of the activity PayPal questioned", "Documents showing the activity was permitted", "Any corrective steps you have taken"],
    limitation: ["Explanation of the account activity PayPal questioned", "Invoices, contracts or receipts for that activity", "Proof of identity if requested"],
    unknown: ["The exact reason given in the notice", "Documents that relate to that reason"],
  };
  const reasonLine = notice
    .split(/\n|(?<=[.!?])\s/)
    .map((s) => s.trim())
    .find((s) => /(limit|hold|restrict|verify|review|violat|unusual|suspend)/i.test(s));
  return { kind, statedReason: reasonLine ?? null, suggestedEvidence: requests[kind] };
}

export async function draftAppeal(notice: string, evidence: string, name: string): Promise<{ draft: string; origin: "ai" | "template" }> {
  const interp = interpretNotice(notice);
  const ai = await aiText(
    "Draft a polite, factual appeal message to PayPal's Resolution Center. Use ONLY the evidence the user provided. " +
      "Do not add facts, dates, amounts or documents that were not provided. Where information is missing write [ADD: what is needed]. " +
      "Keep under 250 words. Structure: greeting, what happened (from the notice), the facts and documents offered, the specific request, thanks.",
    JSON.stringify({ notice, evidence, name, interpreted: interp })
  );
  if (ai) return { draft: ai.trim(), origin: "ai" };

  const ev = evidence.trim()
    ? evidence.trim().split(/\n+/).map((l) => `- ${l.replace(/^[-*]\s*/, "")}`).join("\n")
    : "- [ADD: your evidence, such as invoices, delivery proof or messages]";
  const draft = `Hello PayPal Resolution Center,

I received a notice about my account: "${interp.statedReason ?? "[ADD: the reason stated in the notice]"}".

I would like to resolve this and provide the following information:
${ev}

Please let me know if anything else is required and what the next steps are.

Thank you,
${name || "[ADD: your name]"}`;
  return { draft, origin: "template" };
}
