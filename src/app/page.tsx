"use client";
import { useState } from "react";
import type { Assessment } from "@/lib/types";
import Checker from "@/components/Checker";
import Activity from "@/components/Activity";
import Appeal from "@/components/Appeal";
import ShareProfile from "@/components/ShareProfile";
import Trace, { TraceStep } from "@/components/Trace";

const TABS = [
  { id: "check", label: "Check & pay" },
  { id: "share", label: "Share my readiness" },
  { id: "activity", label: "After payment" },
  { id: "appeal", label: "Appeal a restriction" },
] as const;
type Tab = (typeof TABS)[number]["id"];

export default function Home() {
  const [tab, setTab] = useState<Tab>("check");
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [txn, setTxn] = useState<{ orderId: string; status: string; amount?: string; currency?: string } | null>(null);
  const [reacted, setReacted] = useState(false);

  const steps: TraceStep[] = [
    { label: "Read the payment's purpose", detail: assessment ? `Interpreted as ${assessment.intent.category}.` : "Describe the payment to start.", done: !!assessment, active: !assessment },
    { label: "Check the consequences", detail: assessment ? "Fees, holds and protection reviewed against sources." : "Waiting for step 1.", done: !!assessment, active: false },
    { label: "You authorize", detail: acknowledged ? "Authorization given for the Sandbox payment." : "Nothing moves until you confirm.", done: acknowledged, active: !!assessment && !acknowledged },
    { label: "PayPal Sandbox payment", detail: txn ? `Order ${txn.orderId.slice(0, 10)}… ${txn.status.toLowerCase()}.` : "Pay with the Sandbox buyer account.", done: !!txn, active: acknowledged && !txn },
    { label: "React to what happens next", detail: reacted ? "Guidance generated from the latest event." : "Watching for payment events.", done: reacted, active: !!txn && !reacted },
  ];

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">PayType Guard</h1>
        <p className="mt-1 text-slate2">Understand before you transact. An AI agent that explains what a payment will mean, then stays with it afterwards.</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div>
          <div role="tablist" aria-label="Sections" className="mb-5 flex gap-1 border-b border-line">
            {TABS.map((t) => (
              <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
                className={`-mb-px border-b-2 px-4 py-2 text-[15px] ${tab === t.id ? "border-signal font-medium text-ink" : "border-transparent text-slate2 hover:text-ink"}`}>
                {t.label}
              </button>
            ))}
          </div>

          <div hidden={tab !== "check"}>
            <Checker assessment={assessment} acknowledged={acknowledged} setAssessment={setAssessment} setAcknowledged={setAcknowledged}
              onCaptured={(r) => { setTxn(r); setReacted(false); setTab("activity"); }} />
          </div>
          <div hidden={tab !== "share"}>
            <ShareProfile />
          </div>
          <div hidden={tab !== "activity"}>
            <Activity orderId={txn?.orderId ?? null} amount={txn?.amount} currency={txn?.currency} onGuidance={setReacted} />
          </div>
          <div hidden={tab !== "appeal"}>
            <Appeal onDrafted={() => {}} />
          </div>
        </div>
        <Trace steps={steps} />
      </div>

      <footer className="mt-10 text-xs text-slate2">
        Sandbox only. PayType Guard can't see PayPal's internal risk decisions and never guarantees a hold or restriction. Fee figures marked "not yet verified" must be checked against PayPal's published rates.
      </footer>
    </main>
  );
}
