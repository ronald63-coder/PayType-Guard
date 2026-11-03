/**
 * Thin Gemini API wrapper (plain fetch, no SDK). Everything works without a key:
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

const KEY = () => process.env.GEMINI_API_KEY;
const MODEL = () => process.env.GEMINI_MODEL || "gemini-2.5-flash";

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
}

async function chat(system: string, user: string, json: boolean): Promise<string | null> {
  const key = KEY();
  if (!key) return null;
  try {
    const model = encodeURIComponent(MODEL());
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: `${AI_GUARDRAILS}\n\n${system}` }] },
          contents: [{ role: "user", parts: [{ text: user }] }],
          generationConfig: {
            temperature: 0.2,
            ...(json ? { responseMimeType: "application/json" } : {}),
          },
        }),
        signal: AbortSignal.timeout(20000),
      },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as GeminiResponse;
    return data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") || null;
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
