"use client";
import { useEffect, useRef, useState } from "react";
import { post } from "@/lib/client";

declare global { interface Window { paypal?: any } }

interface Props {
  amount: number;
  currency: string;
  description: string;
  selectedType: "GS" | "FF";
  onCaptured: (r: { orderId: string; status: string; amount?: string; currency?: string }) => void;
}

export default function PayPalButtons({ amount, currency, description, selectedType, onCaptured }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [err, setErr] = useState<string | null>(null);
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  // Keep latest props available to SDK callbacks without re-rendering the buttons.
  const latest = useRef({ amount, currency, description, selectedType, onCaptured });
  latest.current = { amount, currency, description, selectedType, onCaptured };

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    const id = "paypal-sdk";
    document.getElementById(id)?.remove();
    window.paypal = undefined;
    const s = document.createElement("script");
    s.id = id;
    s.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=${currency}&intent=capture&components=buttons`;
    s.onload = () => {
      if (cancelled || !window.paypal || !ref.current) return;
      ref.current.innerHTML = "";
      window.paypal
        .Buttons({
          createOrder: async () => {
            const l = latest.current;
            const r = await post<{ id: string }>("/api/paypal/create-order", {
              amount: l.amount, currency: l.currency, description: l.description,
              selectedType: l.selectedType, acknowledged: true,
            });
            return r.id;
          },
          onApprove: async (data: { orderID: string }) => {
            try {
              const r = await post("/api/paypal/capture-order", { orderId: data.orderID });
              latest.current.onCaptured(r);
            } catch (e: any) { setErr(e.message); }
          },
          onError: (e: any) => setErr(String(e?.message ?? "PayPal checkout failed.")),
        })
        .render(ref.current);
    };
    s.onerror = () => setErr("Couldn't load the PayPal SDK. Check your connection and client ID.");
    document.body.appendChild(s);
    return () => { cancelled = true; };
  }, [clientId, currency]);

  if (!clientId)
    return <p className="rounded-md bg-wash p-3 text-sm text-caution">Set NEXT_PUBLIC_PAYPAL_CLIENT_ID in .env.local to enable Sandbox checkout.</p>;
  return (
    <div>
      <div ref={ref} aria-label="PayPal checkout" />
      {err && <p role="alert" className="mt-2 text-sm text-stop">{err}</p>}
    </div>
  );
}
