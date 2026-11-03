import { randomUUID } from "crypto";
import type { Assessment, Finding, IntentResult, PaymentInput, PaymentType, RecipientProfile, RecipientReadiness, SenderGuidance, Mismatch } from "./types";
import { analyzeIntent, checkMismatch, recommendedType } from "./intent";
import { calcSellerFee } from "./fees";
import { sourcesFor } from "./knowledge";

export const MAX_AMOUNT = 10000;
export const CURRENCIES = ["USD", "EUR", "GBP"];

export function validateInput(raw: any): { ok: true; value: PaymentInput } | { ok: false; error: string } {
  const amount = Number(raw?.amount);
  const currency = String(raw?.currency ?? "").toUpperCase();
  const description = String(raw?.description ?? "").trim();
  const selectedType = raw?.selectedType;
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: "Enter an amount greater than 0." };
  if (amount > MAX_AMOUNT) return { ok: false, error: `Sandbox demo amounts are capped at ${MAX_AMOUNT}.` };
  if (!CURRENCIES.includes(currency)) return { ok: false, error: `Currency must be one of ${CURRENCIES.join(", ")}.` };
  if (description.length < 3) return { ok: false, error: "Describe what the payment is for." };
  if (description.length > 400) return { ok: false, error: "Keep the description under 400 characters." };
  if (selectedType !== "GS" && selectedType !== "FF") return { ok: false, error: "Choose a payment type." };
  return { ok: true, value: { amount: Math.round(amount * 100) / 100, currency, description, selectedType } };
}

export function recipientReadiness(
  profile: RecipientProfile,
  intent: IntentResult,
  selected: PaymentType
): RecipientReadiness {
  const findings: Finding[] = [];
  const actions: string[] = [];
  const commercial = intent.category === "commercial" || (intent.category === "ambiguous" && selected === "GS");
  let readiness: RecipientReadiness["readiness"] = "ready";

  if (commercial) {
    if (profile.accountType === "personal") {
      readiness = "caution";
      findings.push({
        label: "assumption",
        text: `${profile.name} says they have a personal account. PayPal may review or ask a personal account to upgrade when it receives payments for goods or services. This app can't predict whether that would happen.`,
      });
      actions.push(`Ask ${profile.name} to confirm their account can receive payments for goods or services.`);
    } else if (profile.accountType === "unsure") {
      readiness = "caution";
      findings.push({ label: "assumption", text: `${profile.name} isn't sure what type of account they have, so the fit for a commercial payment is unknown.` });
      actions.push(`Ask ${profile.name} to check their account type in PayPal settings before you send.`);
    } else {
      findings.push({ label: "assumption", text: `${profile.name} says they have a business account, which suits payments for goods or services.` });
    }
    if (!profile.setupComplete) {
      readiness = "caution";
      findings.push({
        label: "assumption",
        text: `${profile.name} says their account setup isn't finished. Unfinished setup can mean extra verification before funds are available.`,
      });
      actions.push(`Ask ${profile.name} to finish account setup first.`);
    }
    if (readiness === "caution") actions.push(`Offer to pay through a PayPal invoice from ${profile.name} instead, if they can create one.`);
  } else if (intent.category === "personal") {
    if (profile.accountType === "business") {
      readiness = "caution";
      findings.push({ label: "assumption", text: `${profile.name} says they have a business account. Confirm they can receive a personal transfer on it.` });
      actions.push(`Ask ${profile.name} whether to send this to a personal account.`);
    }
    if (!profile.setupComplete) {
      readiness = "caution";
      findings.push({ label: "assumption", text: `${profile.name} says account setup isn't finished, which can slow access to funds.` });
      actions.push(`Ask ${profile.name} to finish account setup.`);
    }
  }
  if (findings.length === 0)
    findings.push({ label: "assumption", text: `Nothing in ${profile.name}'s self-reported details clashes with this payment.` });
  if (profile.note) findings.push({ label: "assumption", text: `Note from ${profile.name}: ${profile.note}` });

  return {
    name: profile.name,
    accountType: profile.accountType,
    readiness,
    summary:
      readiness === "ready"
        ? `${profile.name}'s declared account looks suited to this payment.`
        : `${profile.name}'s account may not be ready for this payment. Check before sending.`,
    actions,
    findings,
    declaredAt: profile.createdAt,
  };
}

const typeName = (t: PaymentType) => (t === "GS" ? "Goods & Services" : "Friends & Family");

/**
 * The sender's bottom line. The agent tells the sender to change the transfer type whenever the
 * selected type doesn't match the real purpose. It never tells a sender to relabel a commercial
 * payment as personal to avoid a hold, because that misclassification is itself a common reason
 * for holds and account limits, and removes buyer protection.
 */
export function senderGuidance(
  intent: IntentResult,
  selected: PaymentType,
  mismatch: Mismatch,
  recipient?: RecipientReadiness
): SenderGuidance {
  if (mismatch.hasMismatch && intent.category === "commercial" && selected === "FF") {
    return {
      verdict: "change_type",
      switchTo: "GS",
      headline: "Change the type to Goods & Services before you send.",
      detail:
        "This is a payment for goods or services. Sending it as Friends & Family is the wrong type: it removes protection for you and can lead PayPal to review or hold the recipient's funds, or limit their account.",
      steps: [
        "Select Goods & Services for this payment.",
        ...(recipient && recipient.readiness === "caution" ? recipient.actions : []),
      ],
    };
  }
  if (mismatch.hasMismatch && intent.category === "personal" && selected === "GS") {
    return {
      verdict: "change_type",
      switchTo: "FF",
      headline: "Change the type to Friends & Family before you send.",
      detail:
        "This reads as a personal transfer with nothing being bought. Goods & Services treats it as a sale, which can add a seller fee and extra review for the recipient.",
      steps: ["Select Friends & Family for this payment.", ...(recipient && recipient.readiness === "caution" ? recipient.actions : [])],
    };
  }
  if (recipient && recipient.readiness === "caution") {
    return {
      verdict: "fix_first",
      headline: "Keep the type, but fix this first to lower the chance of a hold.",
      detail:
        `${typeName(selected)} is the right type for this payment. The risk is on the recipient's side, so changing the type won't help. Relabelling a commercial payment as personal would make things worse, not better.`,
      steps: [
        ...recipient.actions,
        "If the recipient can't be ready, pay for this by another method instead (for example a bank transfer or mobile money).",
      ],
    };
  }
  if (intent.category === "ambiguous") {
    return {
      verdict: "fix_first",
      headline: "Describe the payment in more detail first.",
      detail: "The purpose isn't clear enough to say which type fits.",
      steps: ["Say what the money is for: a purchase, paid work, or a personal gift."],
    };
  }
  return {
    verdict: "send_as_is",
    headline: `${typeName(selected)} fits this payment.`,
    detail:
      "Nothing in what you've told us points to a mismatch. A hold still can't be ruled out: PayPal decides that, and this app can't see its risk checks.",
    steps: recipient ? [] : ["Ask the recipient for a readiness link to check their side too."],
  };
}

export async function assess(input: PaymentInput, profile?: RecipientProfile | null): Promise<Assessment> {
  const intent = await analyzeIntent(input.description);
  const mismatch = checkMismatch(intent, input.selectedType);
  const recommended = recommendedType(intent);
  const fees = calcSellerFee(input.amount, input.currency);
  const recipientInfo = profile ? recipientReadiness(profile, intent, input.selectedType) : undefined;

  const findings: Finding[] = [];
  const used = new Set<string>(["fees", "userAgreement"]);

  if (input.selectedType === "GS" || recommended === "GS") {
    findings.push(
      fees.status === "estimated"
        ? {
            label: "estimate",
            text: `Estimated seller fee on ${input.amount.toFixed(2)} ${input.currency}: ${fees.fee!.toFixed(2)} (${fees.percent}% + ${fees.fixed!.toFixed(2)}), leaving about ${fees.net!.toFixed(2)}. ${fees.note}`,
            sourceId: "fees",
          }
        : { label: "assumption", text: fees.note, sourceId: "fees" }
    );
    findings.push({
      label: "documented",
      text: "PayPal's User Agreement lets it place holds or limit funds in some circumstances. Whether this payment would be held cannot be predicted from outside PayPal.",
      sourceId: "userAgreement",
    });
    findings.push({
      label: "documented",
      text: "Goods & Services payments can be covered by protection programs, subject to eligibility conditions.",
      sourceId: "userAgreement",
    });
    findings.push({
      label: "assumption",
      text: "If the recipient's PayPal account is new or has little history, extra verification or slower fund availability is more plausible. This app cannot see account status.",
    });
  }
  if (input.selectedType === "FF") {
    findings.push({
      label: "documented",
      text: "Friends & Family is meant for personal transfers. Using it for a purchase or paid work can forfeit buyer protection.",
      sourceId: "userAgreement",
    });
    findings.push({
      label: "assumption",
      text: "Fees for personal transfers depend on country and funding source. They are not calculated here.",
      sourceId: "fees",
    });
  }
  if (mismatch.hasMismatch) used.add("userAgreement");

  return {
    id: randomUUID(),
    input,
    intent,
    mismatch,
    recommendedType: recommended,
    fees,
    findings,
    ...(recipientInfo ? { recipient: recipientInfo } : {}),
    sender: senderGuidance(intent, input.selectedType, mismatch, recipientInfo),
    sources: sourcesFor(Array.from(used)),
    createdAt: new Date().toISOString(),
  };
}
