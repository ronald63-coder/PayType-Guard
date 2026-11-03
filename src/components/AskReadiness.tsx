"use client";
import { useState } from "react";
import { post } from "@/lib/client";

export default function AskReadiness() {
  const [senderName, setSenderName] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [purpose, setPurpose] = useState("");
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const result = await post<{ token: string }>("/api/ask", {
        senderName,
        amount: amount || undefined,
        currency,
        purpose,
      });
      setLink(`${window.location.origin}/ask/${result.token}`);
    } catch (e: any) {
      setError(e.message);
      setLink(null);
    }
  }

  return (
    <div className="space-y-5">
      <form onSubmit={create} className="card space-y-4">
        <div>
          <h2 className="text-[15px] font-semibold">Ask the person you're paying if their account is ready</h2>
          <p className="mt-1 text-sm text-slate2">
            Create a link and send it to them. They answer three questions about their PayPal account and send a readiness link back. You can then check your payment before deciding whether to send it.
          </p>
        </div>
        <div className="max-w-sm">
          <label htmlFor="sname" className="mb-1 block text-sm font-medium">Your name</label>
          <input id="sname" className="field" value={senderName} onChange={(e) => setSenderName(e.target.value)} required />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="samt" className="mb-1 block text-sm font-medium">Amount (optional)</label>
            <input id="samt" className="field num" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div>
            <label htmlFor="scur" className="mb-1 block text-sm font-medium">Currency</label>
            <select id="scur" className="field" value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {["USD", "EUR", "GBP"].map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>
        </div>
        <div className="max-w-md">
          <label htmlFor="spur" className="mb-1 block text-sm font-medium">What is it for? (optional)</label>
          <input id="spur" className="field" value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="e.g. website design" maxLength={200} />
        </div>
        <button className="btn-primary">Create request link</button>
        {error && <p role="alert" className="text-sm text-stop">{error}</p>}
      </form>

      {link && (
        <section className="card space-y-3" aria-live="polite">
          <h2 className="text-[15px] font-semibold">Send this to the person you're paying</h2>
          <a aria-label="Open request link" className="field block break-all font-mono text-xs text-signal underline" href={link}>
            {link}
          </a>
          <div className="flex flex-wrap gap-2">
            <button className="btn-quiet" onClick={async () => { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
              {copied ? "Copied" : "Copy link"}
            </button>
          </div>
          <p className="text-xs text-slate2">They'll send you back a readiness link. What they tell you is self-reported.</p>
        </section>
      )}
    </div>
  );
}
