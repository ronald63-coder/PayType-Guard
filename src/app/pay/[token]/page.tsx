import { verifyProfile } from "@/lib/profile";
import SenderView from "@/components/SenderView";

const CURRENCIES = ["USD", "EUR", "GBP"];

export default async function PayPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ a?: string; c?: string; d?: string }> }) {
  const [{ token: rawToken }, query] = await Promise.all([params, searchParams]);
  const token = decodeURIComponent(rawToken);
  const profile = verifyProfile(token);
  if (!profile) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16">
        <h1 className="text-xl font-semibold">This link isn't valid</h1>
        <p className="mt-2 text-slate2">It may be incomplete or altered. Ask the person you're paying to send a new readiness link.</p>
      </main>
    );
  }
  const amount = /^\d{1,5}(\.\d{1,2})?$/.test(query.a ?? "") ? query.a : undefined;
  const currency = CURRENCIES.includes(query.c ?? "") ? query.c : undefined;
  const description = query.d ? query.d.slice(0, 200) : undefined;
  return <SenderView profile={profile} token={token} initial={{ amount, currency, description }} />;
}
