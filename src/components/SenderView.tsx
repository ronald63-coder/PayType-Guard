"use client";
import { useState } from "react";
import type { Assessment, RecipientProfile } from "@/lib/types";
import Checker from "./Checker";

export default function SenderView({ profile, token, initial }: { profile: RecipientProfile; token: string; initial?: { amount?: string; currency?: string; description?: string } }) {
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [done, setDone] = useState<{ orderId: string; status: string } | null>(null);

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <p className="text-sm text-slate2">PayType Guard</p>
        <h1 className="text-2xl font-semibold tracking-tight">Paying {profile.name}</h1>
        <p className="mt-1 text-slate2">Check that your payment suits {profile.name}'s PayPal account before you send it.</p>
      </header>
      <Checker
        assessment={assessment}
        acknowledged={acknowledged}
        setAssessment={setAssessment}
        setAcknowledged={setAcknowledged}
        onCaptured={(r) => setDone({ orderId: r.orderId, status: r.status })}
        profile={profile}
        profileToken={token}
        initial={initial}
      />
      {done && (
        <p role="status" className="card mt-5 text-sm">
          Sandbox payment {done.status.toLowerCase()}. Order <span className="font-mono">{done.orderId}</span>.
        </p>
      )}
    </main>
  );
}
