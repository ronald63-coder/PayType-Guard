import type { TxnEvent } from "./types";

/**
 * In-memory store: fine for local dev and a single-instance demo.
 * On Vercel, serverless instances don't share memory, so webhook events may not reach the
 * instance that serves the UI. For the deployed demo, swap these functions for Supabase
 * (see docs/schema.sql). The rest of the app only uses this interface.
 */
const g = globalThis as unknown as { __ptg_events?: TxnEvent[] };
const events = (g.__ptg_events ??= []);

export function addEvent(e: TxnEvent) {
  events.unshift(e);
  if (events.length > 200) events.length = 200;
}

export function listEvents(orderId?: string): TxnEvent[] {
  return orderId ? events.filter((e) => e.orderId === orderId) : events.slice(0, 50);
}
