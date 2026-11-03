export type PaymentType = "GS" | "FF";
export type IntentCategory = "commercial" | "personal" | "ambiguous";
export type Label = "documented" | "estimate" | "assumption";

export interface PaymentInput {
  amount: number;
  currency: string;
  description: string;
  selectedType: PaymentType;
}

export interface IntentResult {
  category: IntentCategory;
  confidence: number; // 0..1
  reasons: string[];
  source: "rules" | "ai";
}

export interface Source {
  id: string;
  title: string;
  url: string;
  /** ISO date when a human last checked this source against the claim. null = not verified yet. */
  lastVerified: string | null;
}

export interface Finding {
  label: Label;
  text: string;
  sourceId?: string;
}

export interface FeeResult {
  status: "estimated" | "not_configured";
  percent?: number;
  fixed?: number;
  fee?: number;
  net?: number;
  verified: boolean;
  note: string;
  sourceId: string;
}

export interface Mismatch {
  hasMismatch: boolean;
  message?: string;
}

export interface RecipientProfile {
  name: string;
  accountType: "personal" | "business" | "unsure";
  setupComplete: boolean;
  note?: string;
  createdAt: string;
}

export interface RecipientReadiness {
  name: string;
  accountType: RecipientProfile["accountType"];
  readiness: "ready" | "caution";
  summary: string;
  actions: string[];
  findings: Finding[];
  declaredAt: string;
}

export interface SenderGuidance {
  verdict: "send_as_is" | "change_type" | "fix_first";
  headline: string;
  detail: string;
  /** Type the sender should use, when the verdict is change_type. */
  switchTo?: PaymentType;
  steps: string[];
}

export interface Assessment {
  id: string;
  input: PaymentInput;
  intent: IntentResult;
  mismatch: Mismatch;
  recommendedType: PaymentType | "unclear";
  fees: FeeResult;
  findings: Finding[];
  recipient?: RecipientReadiness;
  sender: SenderGuidance;
  sources: Source[];
  createdAt: string;
}

export type TxnStatus =
  | "APPROVED"
  | "COMPLETED"
  | "PENDING"
  | "DENIED"
  | "REFUNDED"
  | "UNKNOWN";

export interface TxnEvent {
  id: string;
  orderId: string;
  status: TxnStatus;
  eventType: string;
  amount?: string;
  currency?: string;
  origin: "webhook" | "capture-response" | "simulation";
  signatureVerified: boolean;
  receivedAt: string;
}

export interface Guidance {
  headline: string;
  severity: "info" | "good" | "caution" | "bad";
  steps: string[];
  donts: string[];
  narrative?: string;
}
