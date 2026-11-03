import type { Source } from "./types";

/**
 * Dated, source-linked knowledge base.
 * RULE: every policy claim shown in the UI must point at one of these sources.
 * Before the demo, open each URL, confirm the claim, and set lastVerified.
 */
export const SOURCES: Record<string, Source> = {
  fees: {
    id: "fees",
    title: "PayPal business fees",
    url: "https://www.paypal.com/us/business/paypal-business-fees",
    lastVerified: null,
  },
  userAgreement: {
    id: "userAgreement",
    title: "PayPal User Agreement",
    url: "https://www.paypal.com/us/legalhub/paypal/useragreement-full",
    lastVerified: null,
  },
  resolution: {
    id: "resolution",
    title: "PayPal Resolution Center",
    url: "https://www.paypal.com/resolutioncenter",
    lastVerified: null,
  },
  orders: {
    id: "orders",
    title: "PayPal Orders API v2",
    url: "https://developer.paypal.com/docs/api/orders/v2/",
    lastVerified: null,
  },
  webhooks: {
    id: "webhooks",
    title: "PayPal Webhooks",
    url: "https://developer.paypal.com/api/rest/webhooks/",
    lastVerified: null,
  },
};

export function sourcesFor(ids: string[]): Source[] {
  return Array.from(new Set(ids)).map((id) => SOURCES[id]).filter(Boolean);
}
