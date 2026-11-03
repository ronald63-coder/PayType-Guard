export interface TraceStep { label: string; detail: string; done: boolean; active: boolean }

/** The agent's visible reasoning trail: each step the agent took, and which one needs the user. */
export default function Trace({ steps }: { steps: TraceStep[] }) {
  return (
    <aside className="card lg:sticky lg:top-6" aria-label="Agent trace">
      <h2 className="text-[15px] font-semibold">What the agent has done</h2>
      <ol className="mt-4 space-y-0">
        {steps.map((s, i) => (
          <li key={s.label} className="relative flex gap-3 pb-5 last:pb-0">
            {i < steps.length - 1 && (
              <span className={`absolute left-[7px] top-4 h-full w-px ${s.done ? "bg-ok" : "bg-line"}`} aria-hidden />
            )}
            <span
              className={`relative mt-1 h-[15px] w-[15px] shrink-0 rounded-full border-2 ${
                s.done ? "border-ok bg-ok" : s.active ? "border-signal bg-white" : "border-line bg-white"
              }`}
              aria-hidden
            />
            <div>
              <p className={`text-sm font-medium ${s.done || s.active ? "text-ink" : "text-slate2"}`}>
                {s.label}
                <span className="sr-only">{s.done ? " (done)" : s.active ? " (waiting)" : ""}</span>
              </p>
              <p className="text-[13px] leading-snug text-slate2">{s.detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </aside>
  );
}
