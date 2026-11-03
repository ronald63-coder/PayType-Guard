import { verifyAsk } from "@/lib/profile";
import ShareProfile from "@/components/ShareProfile";

export default async function AskPage({ params }: { params: Promise<{ token: string }> }) {
  const { token: rawToken } = await params;
  const token = decodeURIComponent(rawToken);
  const ask = verifyAsk(token);
  if (!ask) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16">
        <h1 className="text-xl font-semibold">This link isn't valid</h1>
        <p className="mt-2 text-slate2">It may be incomplete or altered. Ask the sender to create a new request link.</p>
      </main>
    );
  }
  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <p className="text-sm text-slate2">PayType Guard</p>
        <h1 className="text-2xl font-semibold tracking-tight">{ask.senderName} wants to check before paying you</h1>
        <p className="mt-1 text-slate2">
          {ask.amount ? `Planned payment: ${ask.amount.toFixed(2)} ${ask.currency ?? ""}` : "A payment is planned"}
          {ask.purpose ? ` for ${ask.purpose}` : ""}. Share your account readiness so they can review it before deciding whether to pay.
        </p>
      </header>
      <ShareProfile askedBy={ask.senderName} context={{ amount: ask.amount, currency: ask.currency, purpose: ask.purpose }} />
    </main>
  );
}
