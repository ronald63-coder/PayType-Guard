import type { FeeResult } from "./types";

/**
 * Seller-fee rules. Deterministic: the AI never computes or invents fees.
 * !! These sample rates are NOT verified. Confirm against the fee page for the
 * recipient's market, then flip `verified` to true and set asOf.
 */
export const FEE_RULES = {
  market: "US (sample configuration)",
  asOf: null as string | null,
  verified: false,
  percent: 3.49,
  fixedByCurrency: { USD: 0.49 } as Record<string, number>,
};

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function calcSellerFee(amount: number, currency: string): FeeResult {
  const fixed = FEE_RULES.fixedByCurrency[currency];
  if (fixed === undefined) {
    return {
      status: "not_configured",
      verified: false,
      sourceId: "fees",
      note: `No fee rule is configured for ${currency}. Check the fee page for your market.`,
    };
  }
  const fee = round2((amount * FEE_RULES.percent) / 100 + fixed);
  return {
    status: "estimated",
    percent: FEE_RULES.percent,
    fixed,
    fee,
    net: round2(amount - fee),
    verified: FEE_RULES.verified,
    sourceId: "fees",
    note: FEE_RULES.verified
      ? `Rule for ${FEE_RULES.market}, as of ${FEE_RULES.asOf}.`
      : `Sample rate for ${FEE_RULES.market}. Not yet verified: confirm on PayPal's fee page.`,
  };
}
