"use client";
import { useEffect, useState } from "react";
import { post } from "@/lib/client";
import type { Guidance, TxnEvent, TxnStatus } from "@/lib/types";

const sev = {
  info: "border-signal/40 bg-[#EEF3FF]",
  good: "border-ok/40 bg-[#EAF7F2]",
  caution: "border-caution/40 bg-[#FFF8EC]",
  bad: "border-stop/40 bg-[#FDEEEC]",
};
const STATUS_LABEL: Record<TxnStatus, string> = {
  APPROVED: "Approved by buyer", COMPLETED: "Completed", PENDING: "Pending / possibly held",
  DENIED: "Denied", REFUNDED: "Refunded", UNKNOWN: "Unknown",
};
const SIM = [
  ["PAYMENT.CAPTURE.COMPLETED", "Completed"],
  ["PAYMENT.CAPTURE.PENDING", "Pending"],
  ["PAYMENT.CAPTURE.DENIED", "Denied"],
  ["PAYMENT.CAPTURE.REFUNDED", "Refunded"],
] as const;

export default function Activity({ orderId, amount, currency, onGuidance }: {
  orderId: string | null; amount?: string; currency?: string; onGuidance: (done: boolean) => void;
}) {
  const [events, setEvents] = useState<TxnEvent[]>([]);
  const [guidance, setGuidance] = useState<Guidance | null>(null);
  const [manual, setManual] = useState<TxnStatus>("PENDING");
  const [msg, setMsg] = useState<string | null>(null);

  // Poll for events on this order (webhooks, capture response, simulations).
  useEffect(() => {
    if (!orderId) return;
    let stop = false;
    const tick = async () => {
      try {
        const r = await fetch(`/api/events?orderId=${encodeURIComponent(orderId)}`, { cache: "no-store" });
        const d = await r.json();
        if (!stop) setEvents(d.events ?? []);
      } catch { /* keep polling */ }
    };
    tick();
    const t = setInterval(tick, 4000);
    return () => { stop = true; clearInterval(t); };
  }, [orderId]);

  // The agent reacts to the newest event.
  const latest = events[0];
  useEffect(() => {
    if (!latest) return;
    let live = true;
    post<Guidance>("/api/advice", { status: latest.status, amount: latest.amount, currency: latest.currency })
      .then((g) => { if (live) { setGuidance(g); onGuidance(true); } })
      .catch(() => {});
    return () => { live = false; };
  }, [latest?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function explain(status: TxnStatus) {
    setMsg(null);
    try { setGuidance(await post<Guidance>("/api/advice", { status, amount, currency })); }
    catch (e: any) { setMsg(e.message); }
  }
  async function simulate(eventType: string) {
    setMsg(null);
    try { await post("/api/paypal/simulate", { orderId, eventType, amount, currency }); }
    catch (e: any) { setMsg(e.message); }
  }

  return (
    <div className="space-y-5">
      <section className="card">
        <h2 className="text-[15px] font-semibold">Payment events</h2>
        {!orderId ? (
          <p className="mt-2 text-sm text-slate2">Complete a Sandbox payment on the Check tab and its events will appear here.</p>
        ) : (
          <>
            <p className="mt-1 text-sm text-slate2">Order <span className="font-mono">{orderId}</span></p>
            <ul className="mt-3 divide-y divide-line">
              {events.length === 0 && <li className="py-2 text-sm text-slate2">Waiting for events…</li>}
              {events.map((e) => (
                <li key={e.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
                  <span className="font-medium">{STATUS_LABEL[e.status]}</span>
                  <span className="font-mono text-xs text-slate2">{e.eventType}</span>
                  <span className={`rounded px-2 py-0.5 text-xs ${e.origin === "simulation" ? "bg-[#FFF1DC] text-caution" : "bg-[#E4F4EE] text-ok"}`}>
                    {e.origin === "simulation" ? "simulated, unverified" : e.origin === "webhook" ? "webhook, signature verified" : "PayPal capture response"}
                  </span>
                  <span className="ml-auto text-xs text-slate2">{new Date(e.receivedAt).toLocaleTimeString()}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
              <span className="text-[13px] text-slate2">No public webhook URL? Simulate one:</span>
              {SIM.map(([t, l]) => <button key={t} className="btn-quiet !py-1 text-[13px]" onClick={() => simulate(t)}>{l}</button>)}
            </div>
          </>
        )}
      </section>

      <section className="card space-y-3">
        <h2 className="text-[15px] font-semibold">Explain a payment status</h2>
        <p className="text-sm text-slate2">Got a notification from PayPal? Pick the status to see what it means and what to do.</p>
        <div className="flex flex-wrap gap-2">
          <select aria-label="Payment status" className="field max-w-[260px]" value={manual} onChange={(e) => setManual(e.target.value as TxnStatus)}>
            {(["APPROVED", "COMPLETED", "PENDING", "DENIED", "REFUNDED"] as TxnStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
          <button className="btn-primary" onClick={() => explain(manual)}>Explain</button>
        </div>
        {msg && <p role="alert" className="text-sm text-stop">{msg}</p>}
      </section>

      {guidance && (
        <section className={`rounded-lg border p-5 ${sev[guidance.severity]}`} aria-live="polite">
          <h3 className="text-base font-semibold">{guidance.headline}</h3>
          {guidance.narrative && <p className="mt-2 text-sm">{guidance.narrative}</p>}
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm font-medium">Do</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">{guidance.steps.map((s) => <li key={s}>{s}</li>)}</ul>
            </div>
            {guidance.donts.length > 0 && (
              <div>
                <p className="text-sm font-medium">Don't</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">{guidance.donts.map((s) => <li key={s}>{s}</li>)}</ul>
              </div>
            )}
          </div>
          <p className="mt-3 text-xs text-slate2">General guidance, not a prediction about your account. PayPal's own messages are authoritative.</p>
        </section>
      )}
    </div>
  );
}
