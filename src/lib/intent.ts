import type { IntentResult, IntentCategory, Mismatch, PaymentType } from "./types";
import { aiJson } from "./ai";

const COMMERCIAL = [
  "design", "website", "web site", "freelance", "invoice", "service", "services", "product",
  "buy", "bought", "purchase", "phone", "order", "subscription", "hosting", "consulting",
  "logo", "project", "software", "course", "tutoring", "delivery", "client", "customer",
  "seller", "shop", "store", "contract", "commission", "app development", "editing", "translation",
];
const PERSONAL = [
  "sister", "brother", "sibling", "mom", "mum", "dad", "mother", "father", "family", "gift",
  "birthday", "wedding", "cousin", "uncle", "aunt", "allowance", "pocket money",
];
const REPAY = ["friend", "repay", "repaying", "pay back", "owe", "split", "share of dinner", "lent"];

const hits = (text: string, words: string[]) => words.filter((w) => text.includes(w));

export function analyzeIntentRules(description: string): IntentResult {
  const t = description.toLowerCase();
  const c = hits(t, COMMERCIAL);
  const p = hits(t, PERSONAL);
  const r = hits(t, REPAY);

  let category: IntentCategory;
  let confidence: number;
  const reasons: string[] = [];

  if (c.length && !p.length && !r.length) {
    category = "commercial";
    confidence = Math.min(0.95, 0.65 + 0.1 * c.length);
    reasons.push(`Mentions goods or services (${c.slice(0, 3).join(", ")}).`);
  } else if ((p.length || r.length) && !c.length) {
    category = "personal";
    confidence = r.length && !p.length ? 0.6 : Math.min(0.95, 0.7 + 0.1 * p.length);
    reasons.push(
      r.length && !p.length
        ? "Sounds like repaying or splitting with someone you know: potentially personal."
        : `Mentions a personal relationship or occasion (${p.slice(0, 3).join(", ")}).`
    );
  } else {
    category = "ambiguous";
    confidence = 0.4;
    reasons.push(
      c.length && (p.length || r.length)
        ? "Contains both commercial and personal signals."
        : "Not enough detail to tell whether this is a purchase or a personal transfer."
    );
  }
  return { category, confidence: Math.round(confidence * 100) / 100, reasons, source: "rules" };
}

/** Rules first; if an AI key is configured, let the model refine the reading of the free text. */
export async function analyzeIntent(description: string): Promise<IntentResult> {
  const rules = analyzeIntentRules(description);
  const ai = await aiJson<{ category: IntentCategory; confidence: number; reasons: string[] }>(
    "You classify the purpose of a payment from a short user description. " +
      'Reply ONLY with JSON: {"category":"commercial"|"personal"|"ambiguous","confidence":0..1,"reasons":[string]}. ' +
      "commercial = paying for goods, services or work. personal = gifts or support between people with no purchase. " +
      "Use ambiguous when unsure. Never suggest a category to avoid fees.",
    description
  );
  if (
    ai &&
    ["commercial", "personal", "ambiguous"].includes(ai.category) &&
    typeof ai.confidence === "number"
  ) {
    // If the model and the rules disagree, be honest about it instead of picking a winner silently.
    if (ai.category !== rules.category && rules.category !== "ambiguous" && ai.category !== "ambiguous") {
      return {
        category: "ambiguous",
        confidence: 0.4,
        reasons: ["Automated readings disagree about this description.", ...(ai.reasons ?? []).slice(0, 2)],
        source: "ai",
      };
    }
    return {
      category: ai.category,
      confidence: Math.max(0, Math.min(1, ai.confidence)),
      reasons: (ai.reasons ?? []).slice(0, 3),
      source: "ai",
    };
  }
  return rules;
}

export function checkMismatch(intent: IntentResult, selected: PaymentType): Mismatch {
  if (intent.category === "commercial" && selected === "FF") {
    return {
      hasMismatch: true,
      message:
        "This reads as a payment for goods or services, but Friends & Family is selected. Commercial payments belong in Goods & Services. Using the wrong type can remove buyer protection and may breach PayPal's terms.",
    };
  }
  if (intent.category === "personal" && selected === "GS") {
    return {
      hasMismatch: true,
      message:
        "This reads as a personal transfer, but Goods & Services is selected. If no goods or services are being bought, a personal payment is the intended type. Goods & Services may add a seller fee for the recipient.",
    };
  }
  return { hasMismatch: false };
}

export function recommendedType(intent: IntentResult): PaymentType | "unclear" {
  if (intent.category === "commercial") return "GS";
  if (intent.category === "personal") return "FF";
  return "unclear";
}
