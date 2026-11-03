"use client";
import { useState } from "react";
import { post } from "@/lib/client";
import type { Assessment, Label, RecipientProfile } from "@/lib/types";
import PayPalButtons from "./PayPalButtons";

const chip: Record<Label, string> = {
  documented: "bg-[#E4F4EE] text-ok",
  estimate: "bg-[#E6EDFF] text-signal",
  assumption: "bg-[#FFF1DC] text-caution",
};

const EXAMPLES = [
  { text: "Receiving payment for designing a website for a client", type: "GS" as const, amount: "500" },
  { text: "Sending money to my sister for her birthday", type: "FF" as const, amount: "50" },
  { text: "Paying a freelancer for a logo", type: "FF" as const, amount: "120" },
];

interface Props {
  assessment: Assessment | null;
  acknowledged: boolean;
  setAssessment: (a: Assessment | null) => void;
  setAcknowledged: (v: boolean) => void;
  onCaptured: (r: { orderId: string; status: string; amount?: string; currency?: string }) => void;
  /** Set on the sender page: the recipient's self-declared readiness link. */
  profile?: RecipientProfile;
  profileToken?: string;
}

export default function Checker({ assessment, acknowledged, setAssessment, setAcknowledged, onCaptured, profile, profileToken }: Props) {
  const [amount, setAmount] = useState("500");
  const [currency, setCurrency] = useState("USD");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"GS" | "FF">("GS");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null); setAcknowledged(false);
    try {
      setAssessment(await post<Assessment>("/api/assess", { amount: Number(amount), currency, description, selectedType: type, profileToken }));
    } catch (err: any) { setError(err.message); setAssessment(null); }
    finally { setBusy(false); }
  }

  const a = assessment;
  return (
    <div className="space-y-5">
      <form onSubmit={run} className="card space-y-4">
        <div>
          <label htmlFor="desc" className="mb-1 block text-sm font-medium">
            {profile ? `What are you paying ${profile.name} for?` : "What is the payment for?"}
          </label>
          <textarea id="desc" className="field min-h-[84px]" value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. I'm receiving $500 for designing a website" required />
          <div className={`mt-2 flex flex-wrap gap-2 ${profile ? "hidden" : ""}`}>
            {EXAMPLES.map((x) => (
              <button type="button" key={x.text} className="rounded-full border border-line px-3 py-1 text-[13px] text-slate2 hover:bg-wash"
                onClick={() => { setDescription(x.text); setType(x.type); setAmount(x.amount); }}>
                {x.text}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="amt" className="mb-1 block text-sm font-medium">Amount</label>
            <input id="amt" className="field num" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </div>
          <div>
            <label htmlFor="cur" className="mb-1 block text-sm font-medium">Currency</label>
            <select id="cur" className="field" value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {["USD", "EUR", "GBP"].map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <fieldset>
            <legend className="mb-1 text-sm font-medium">Payment type selected</legend>
            <div className="flex gap-2">
              {([["GS", "Goods & Services"], ["FF", "Friends & Family"]] as const).map(([v, l]) => (
                <label key={v} className={`flex-1 cursor-pointer rounded-md border px-2 py-2 text-center text-[13px] ${type === v ? "border-signal bg-[#E6EDFF] text-signal" : "border-line"}`}>
                  <input type="radio" className="sr-only" name="ptype" checked={type === v} onChange={() => setType(v)} />
                  {l}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
        <button className="btn-primary" disabled={busy}>{busy ? "Analysing…" : "Check consequences"}</button>
        {error && <p role="alert" className="text-sm text-stop">{error}</p>}
      </form>

      {a && (
        <section className="card space-y-5" aria-live="polite">
          <div className={`rounded-md border p-4 ${a.sender.verdict === "send_as_is" ? "border-ok/40 bg-[#EAF7F2]" : "border-caution/40 bg-[#FFF8EC]"}`}>
            <h2 className="text-lg font-semibold">{a.sender.headline}</h2>
            <p className="mt-1 text-sm">{a.sender.detail}</p>
            {a.sender.steps.length > 0 && (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{a.sender.steps.map((x) => <li key={x}>{x}</li>)}</ul>
            )}
            {a.sender.switchTo && a.sender.switchTo !== a.input.selectedType && (
              <button type="button" className="btn-primary mt-3" onClick={() => { setType(a.sender.switchTo!); setAssessment(null); setAcknowledged(false); }}>
                Switch to {a.sender.switchTo === "GS" ? "Goods & Services" : "Friends & Family"} and re-check
              </button>
            )}
          </div>

          <div>
            <h3 className="text-[15px] font-semibold">
              {a.intent.category === "commercial" && "This looks like a payment for goods or services."}
              {a.intent.category === "personal" && "This looks like a personal transfer."}
              {a.intent.category === "ambiguous" && "The purpose isn't clear yet."}
            </h3>
            <p className="mt-1 text-sm text-slate2">
              Confidence <span className="num">{Math.round(a.intent.confidence * 100)}%</span> · {a.intent.reasons.join(" ")}
              {a.recommendedType !== "unclear" && <> Matching type: <strong className="text-ink">{a.recommendedType === "GS" ? "Goods & Services" : "Friends & Family"}</strong>.</>}
            </p>
          </div>

          {a.recipient && (
            <div className={`rounded-md border p-3 text-sm ${a.recipient.readiness === "ready" ? "border-ok/40 bg-[#EAF7F2]" : "border-caution/40 bg-[#FFF8EC]"}`}>
              <p className={`font-medium ${a.recipient.readiness === "ready" ? "text-ok" : "text-caution"}`}>{a.recipient.summary}</p>
              <p className="mt-1 text-[13px] text-slate2">
                Self-reported by {a.recipient.name} on {new Date(a.recipient.declaredAt).toLocaleDateString()}. PayType Guard can't see their PayPal account.
              </p>
              <ul className="mt-2 space-y-1">
                {a.recipient.findings.map((f, i) => <li key={i}>{f.text}</li>)}
              </ul>
              {a.recipient.actions.length > 0 && (
                <div className="mt-2">
                  <p className="font-medium">Before you send</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5">{a.recipient.actions.map((x) => <li key={x}>{x}</li>)}</ul>
                </div>
              )}
            </div>
          )}

          {a.mismatch.hasMismatch && (
            <div role="alert" className="rounded-md border border-caution/40 bg-[#FFF8EC] p-3 text-sm">
              <p className="font-medium text-caution">Selected type doesn't match the purpose</p>
              <p className="mt-1">{a.mismatch.message}</p>
              <p className="mt-1 text-slate2">PayType Guard won't suggest changing the type to dodge fees or protections.</p>
            </div>
          )}

          {a.fees.status === "estimated" && (
            <dl className="grid grid-cols-3 gap-3 rounded-md bg-wash p-3 text-sm">
              <div><dt className="text-slate2">Amount</dt><dd className="num text-base font-medium">{a.input.amount.toFixed(2)}</dd></div>
              <div><dt className="text-slate2">Est. seller fee</dt><dd className="num text-base font-medium">{a.fees.fee!.toFixed(2)}</dd></div>
              <div><dt className="text-slate2">Est. you keep</dt><dd className="num text-base font-medium">{a.fees.net!.toFixed(2)}</dd></div>
            </dl>
          )}

          <ul className="space-y-2">
            {a.findings.map((f, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className={`mt-0.5 h-fit shrink-0 rounded px-2 py-0.5 text-xs font-medium ${chip[f.label]}`}>{f.label}</span>
                <span>{f.text}</span>
              </li>
            ))}
          </ul>

          <p className="text-[13px] text-slate2">
            Sources:{" "}
            {a.sources.map((s, i) => (
              <span key={s.id}>
                {i > 0 && ", "}
                <a className="underline" href={s.url} target="_blank" rel="noreferrer">{s.title}</a>
                {s.lastVerified ? ` (checked ${s.lastVerified})` : " (not yet verified)"}
              </span>
            ))}
          </p>

          <div className="border-t border-line pt-4">
            <h3 className="text-[15px] font-semibold">Pay with the PayPal Sandbox</h3>
            <p className="mt-1 text-sm text-slate2">
              Demo checkout: a simulated merchant order for {a.input.amount.toFixed(2)} {a.input.currency}. It doesn't intercept a real personal transfer.
            </p>
            <label className="mt-3 flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-1" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} />
              I've reviewed these consequences and authorize this Sandbox payment.
            </label>
            {acknowledged && (
              <div className="mt-4 max-w-sm">
                <PayPalButtons amount={a.input.amount} currency={a.input.currency} description={a.input.description}
                  selectedType={a.input.selectedType} onCaptured={onCaptured} />
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
