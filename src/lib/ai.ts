/**
 * Thin OpenAI wrapper (plain fetch, no SDK). Everything works without a key:
 * callers get null and fall back to deterministic templates.
 */
export const AI_GUARDRAILS = [
  "You are PayType Guard, a payment-safety assistant. You explain; you do not decide for the user.",
  "Never claim to know PayPal's internal risk score or guarantee a hold or restriction.",
  "Never state fee rates, hold durations or policy details that are not in the provided data.",
  "Never encourage labelling a commercial payment as personal to avoid fees or protections.",
  "Never invent evidence or facts for an appeal. Use only what the user provided.",
  "Label anything uncertain as an estimate or assumption. Be concise and plain-spoken.",
].join(" ");

const KEY = () => process.env.OPENAI_API_KEY;
const MODEL = () => process.env.OPENAI_MODEL || "gpt-4o-mini";

async function chat(system: string, user: string, json: boolean): Promise<string | null> {
  const key = KEY();
  if (!key) return null;
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: MODEL(),
        temperature: 0.2,
        ...(json ? { response_format: { type: "json_object" } } : {}),
        messages: [
          { role: "system", content: `${AI_GUARDRAILS}\n\n${system}` },
          { role: "user", content: user },
        ],
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.choices?.[0]?.message?.content ?? null;
  } catch {
    return null;
  }
}

export async function aiText(system: string, user: string): Promise<string | null> {
  return chat(system, user, false);
}

export async function aiJson<T>(system: string, user: string): Promise<T | null> {
  const out = await chat(system, user, true);
  if (!out) return null;
  try {
    return JSON.parse(out) as T;
  } catch {
    return null;
  }
}

export const aiConfigured = () => Boolean(KEY());
