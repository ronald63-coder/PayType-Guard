import { afterEach, describe, expect, it, vi } from "vitest";
import { aiConfigured, aiJson, aiText } from "@/lib/ai";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("Gemini integration", () => {
  it("sends text requests to the configured Gemini model", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    vi.stubEnv("GEMINI_MODEL", "gemini-test");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        candidates: [{ content: { parts: [{ text: "Gemini response" }] } }],
      })),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(aiText("system prompt", "user prompt")).resolves.toBe("Gemini response");
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://generativelanguage.googleapis.com/v1beta/models/gemini-test:generateContent");
    expect(init.headers["x-goog-api-key"]).toBe("test-key");
    const request = JSON.parse(init.body);
    expect(request.systemInstruction.parts[0].text).toContain("system prompt");
    expect(request.contents[0]).toEqual({ role: "user", parts: [{ text: "user prompt" }] });
    expect(request.generationConfig).toEqual({ temperature: 0.2 });
  });

  it("requests and parses JSON responses", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        candidates: [{ content: { parts: [{ text: '{"category":"personal"}' }] } }],
      })),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(aiJson<{ category: string }>("system", "user")).resolves.toEqual({ category: "personal" });
    const request = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(request.generationConfig.responseMimeType).toBe("application/json");
  });

  it("does not call Gemini without an API key", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    expect(aiConfigured()).toBe(false);
    await expect(aiText("system", "user")).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
