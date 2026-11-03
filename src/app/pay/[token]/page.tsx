import { verifyProfile } from "@/lib/profile";
import SenderView from "@/components/SenderView";

export default function PayPage({ params }: { params: { token: string } }) {
  const profile = verifyProfile(decodeURIComponent(params.token));
  if (!profile) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16">
        <h1 className="text-xl font-semibold">This link isn't valid</h1>
        <p className="mt-2 text-slate2">It may be incomplete or altered. Ask the person you're paying to send a new readiness link.</p>
      </main>
    );
  }
  return <SenderView profile={profile} token={decodeURIComponent(params.token)} />;
}
