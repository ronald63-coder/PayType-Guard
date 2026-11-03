"use client";
import { useState } from "react";
import { post } from "@/lib/client";

interface Interp { kind: string; statedReason: string | null; suggestedEvidence: string[] }

const SAMPLE = `We've limited your account because of unusual activity. To restore full access, please confirm your identity and provide documents showing the source of the recent payments you received.`;

export default function Appeal({ onDrafted }: { onDrafted: () => void }) {
  const [notice, setNotice] = useState("");
  const [evidence, setEvidence] = useState("");
  const [name, setName] = useState("");
  const [interp, setInterp] = useState<Interp | null>(null);
  const [draft, setDraft] = useState("");
  const [origin, setOrigin] = useState<string | null>(null);
  const [url, setUrl] = useState("https://www.paypal.com/resolutioncenter");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function go(stage: "interpret" | "draft") {
    setBusy(true); setErr(null);
    try {
      const r = await post("/api/appeal", { notice, evidence, name, stage });
      setInterp(r.interpretation); setUrl(r.resolutionCenter);
      if (stage === "draft") { setDraft(r.draft); setOrigin(r.origin); onDrafted(); }
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }

  return (
    <div className="space-y-5">
      <section className="card space-y-4">
        <div>
          <label htmlFor="notice" className="mb-1 block text-sm font-medium">Paste the restriction notice</label>
          <textarea id="notice" className="field min-h-[110px]" value={notice} onChange={(e) => setNotice(e.target.value)} />
          <button type="button" className="mt-2 text-[13px] text-signal underline" onClick={() => setNotice(SAMPLE)}>Use a simulated notice</button>
        </div>
        <button className="btn-quiet" disabled={busy} onClick={() => go("interpret")}>Read the notice</button>
        {err && <p role="alert" className="text-sm text-stop">{err}</p>}
      </section>

      {interp && (
        <section className="card space-y-4" aria-live="polite">
          <div>
            <h2 className="text-[15px] font-semibold">What the notice says</h2>
            <p className="mt-1 text-sm">{interp.statedReason ?? "No clear reason found. Re-read the notice and copy the exact reason PayPal gives."}</p>
          </div>
          <div>
            <p className="text-sm font-medium">Evidence that usually helps</p>
            <ul className="mt-1 list-disc pl-5 text-sm">{interp.suggestedEvidence.map((s) => <li key={s}>{s}</li>)}</ul>
          </div>
          <div>
            <label htmlFor="ev" className="mb-1 block text-sm font-medium">Your evidence, one item per line</label>
            <textarea id="ev" className="field min-h-[90px]" value={evidence} onChange={(e) => setEvidence(e.target.value)}
              placeholder="Invoice #112 for website design, sent 4 Oct&#10;Client email confirming delivery" />
            <p className="mt-1 text-[13px] text-slate2">The draft uses only what you list here. Nothing is invented.</p>
          </div>
          <div className="max-w-xs">
            <label htmlFor="nm" className="mb-1 block text-sm font-medium">Your name (optional)</label>
            <input id="nm" className="field" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <button className="btn-primary" disabled={busy} onClick={() => go("draft")}>{busy ? "Drafting…" : "Draft my appeal"}</button>
        </section>
      )}

      {draft && (
        <section className="card space-y-3">
          <h2 className="text-[15px] font-semibold">Your draft <span className="text-xs font-normal text-slate2">({origin === "ai" ? "AI-written" : "template"}, edit freely)</span></h2>
          <textarea aria-label="Appeal draft" className="field min-h-[260px]" value={draft} onChange={(e) => setDraft(e.target.value)} />
          <div className="flex flex-wrap gap-2">
            <button className="btn-quiet" onClick={async () => { await navigator.clipboard.writeText(draft); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
              {copied ? "Copied" : "Copy draft"}
            </button>
            <a className="btn-primary" href={url} target="_blank" rel="noreferrer">Open PayPal Resolution Center</a>
          </div>
          <p className="text-xs text-slate2">PayType Guard never submits appeals or unlocks accounts. Check every line, fill any [ADD: …] gap, then send it yourself.</p>
        </section>
      )}
    </div>
  );
}
