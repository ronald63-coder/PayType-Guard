import type { Guidance, TxnStatus } from "./types";
import { aiText } from "./ai";

const BASE: Record<TxnStatus, Omit<Guidance, "narrative">> = {
  APPROVED: {
    headline: "The buyer approved the payment. It is not complete yet.",
    severity: "info",
    steps: ["Wait for the capture to complete before treating the money as received.", "Keep the order reference."],
    donts: ["Don't deliver irreversible work or goods on approval alone."],
  },
  COMPLETED: {
    headline: "Payment completed.",
    severity: "good",
    steps: [
      "Check the amount received against the fee estimate.",
      "Check your PayPal balance or activity to see whether the funds are available or held.",
      "Keep the invoice, messages and delivery proof for this payment.",
    ],
    donts: ["Don't refund to a different account or outside PayPal if the buyer asks.", "Don't assume funds are withdrawable until PayPal shows them as available."],
  },
  PENDING: {
    headline: "Payment is pending. The funds may be held or under review.",
    severity: "caution",
    steps: [
      "Open the transaction in PayPal and read the stated reason and any release conditions.",
      "Prepare proof of delivery or completed work.",
      "Answer any PayPal request for information promptly.",
    ],
    donts: [
      "Don't ship goods or hand over final deliverables until the funds are available, unless you accept that risk.",
      "Don't contact the buyer to move the payment off PayPal.",
      "Don't open duplicate cases for the same payment.",
    ],
  },
  DENIED: {
    headline: "The payment was denied.",
    severity: "bad",
    steps: ["Don't deliver anything yet.", "Ask the buyer to check their funding source or try another payment method.", "Create a new order if they want to retry."],
    donts: ["Don't treat a denied payment as received.", "Don't ask the buyer to resend as Friends & Family."],
  },
  REFUNDED: {
    headline: "The payment was refunded.",
    severity: "caution",
    steps: ["Confirm who initiated the refund and why.", "Update your records and pause delivery if it hasn't happened."],
    donts: ["Don't deliver after a refund unless a new payment is made."],
  },
  UNKNOWN: {
    headline: "Status not recognised.",
    severity: "info",
    steps: ["Check the transaction in your PayPal activity."],
    donts: [],
  },
};

export function guidanceFor(status: TxnStatus): Guidance {
  const g = BASE[status] ?? BASE.UNKNOWN;
  return { ...g, steps: [...g.steps], donts: [...g.donts] };
}

export async function guidanceWithNarrative(
  status: TxnStatus,
  ctx: { amount?: string; currency?: string }
): Promise<Guidance> {
  const g = guidanceFor(status);
  const narrative = await aiText(
    "Write 2-3 plain sentences explaining what this payment status means for the recipient and what happens next. " +
      "Use only the data given. Do not state hold durations or fee rates. Do not repeat the lists below.",
    JSON.stringify({ status, ...ctx, headline: g.headline, steps: g.steps })
  );
  if (narrative) g.narrative = narrative.trim();
  return g;
}
