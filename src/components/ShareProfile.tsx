"use client";
import { useState } from "react";
import { post } from "@/lib/client";

interface Context {
  amount?: number;
  currency?: string;
  purpose?: string;
}

export default function ShareProfile({ askedBy, context }: { askedBy?: string; context?: Context } = {}) {
  const [name, setName] = useState("");
  const [accountType, setAccountType] = useState<"personal" | "business" | "unsure">("personal");
  const [setupComplete, setSetupComplete] = useState(true);
  const [note, setNote] = useState("");
  const [link, setLink] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      const r = await post<{ token: string }>("/api/profile", { name, accountType, setupComplete, note });
      const query = new URLSearchParams();
      if (context?.amount) query.set("a", String(context.amount));
      if (context?.currency) query.set("c", context.currency);
      if (context?.purpose) query.set("d", context.purpose);
      const queryString = query.toString();
      setLink(`${window.location.origin}/pay/${r.token}${queryString ? `?${queryString}` : ""}`);
    } catch (e: any) { setErr(e.message); setLink(null); }
  }

  return (
    <div className="space-y-5">
      <form onSubmit={create} className="card space-y-4">
        <div>
          <h2 className="text-[15px] font-semibold">{askedBy ? `Tell ${askedBy} what your account can take` : "Tell senders what your account can take"}</h2>
          <p className="mt-1 text-sm text-slate2">
            Create a link to send before someone pays you. They'll see what you declare here and get a warning if their payment doesn't fit. Only what you enter is shared; PayType Guard can't read your PayPal account.
          </p>
        </div>
        <div className="max-w-sm">
          <label htmlFor="pname" className="mb-1 block text-sm font-medium">Name senders will see</label>
          <input id="pname" className="field" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <fieldset>
          <legend className="mb-1 text-sm font-medium">My PayPal account is</legend>
          <div className="flex flex-wrap gap-2">
            {([["personal", "Personal"], ["business", "Business"], ["unsure", "Not sure"]] as const).map(([v, l]) => (
              <label key={v} className={`cursor-pointer rounded-md border px-4 py-2 text-[14px] ${accountType === v ? "border-signal bg-[#E6EDFF] text-signal" : "border-line"}`}>
                <input type="radio" className="sr-only" name="atype" checked={accountType === v} onChange={() => setAccountType(v)} />
                {l}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-1" checked={setupComplete} onChange={(e) => setSetupComplete(e.target.checked)} />
          I've finished account setup (identity, bank or card, and any steps PayPal asks for).
        </label>
        <div className="max-w-md">
          <label htmlFor="pnote" className="mb-1 block text-sm font-medium">Note for senders (optional)</label>
          <input id="pnote" className="field" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. For project work, please ask for my invoice" maxLength={200} />
        </div>
        <button className="btn-primary">Create my link</button>
        {err && <p role="alert" className="text-sm text-stop">{err}</p>}
      </form>

      {link && (
        <section className="card space-y-3" aria-live="polite">
          <h2 className="text-[15px] font-semibold">{askedBy ? `Send this link back to ${askedBy}` : "Send this link before you get paid"}</h2>
          <a aria-label="Open readiness link" className="field block break-all font-mono text-xs text-signal underline" href={link}>
            {link}
          </a>
          <div className="flex flex-wrap gap-2">
            <button className="btn-quiet" onClick={async () => { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
              {copied ? "Copied" : "Copy link"}
            </button>
          </div>
          <p className="text-xs text-slate2">Anyone with the link can read what you entered. It can't be edited without breaking its signature. Make a new link if your account changes.</p>
        </section>
      )}
    </div>
  );
}
