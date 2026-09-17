import { providerById, type AiProviderId } from "./types";

function extractOpenAiText(payload: unknown): string {
  const choices = (payload as { choices?: Array<{ message?: { content?: string } }> }).choices;
  const content = choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("The model returned an empty answer.");
  return content;
}

function extractGeminiText(payload: unknown): string {
  const parts = (payload as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }).candidates?.[0]
    ?.content?.parts;
  const text = parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim();
  if (!text) throw new Error("The model returned an empty answer.");
  return text;
}

function corsHint(provider: AiProviderId): string {
  if (provider === "google") return "Check the Gemini API key and try again.";
  return "This provider may block browser calls. Gemini usually works on this phone. You can also paste a key in Settings.";
}

export async function completeChat(input: {
  provider: AiProviderId;
  model: string;
  apiKey: string;
  prompt: string;
}): Promise<string> {
  const provider = providerById(input.provider);
  const key = input.apiKey.trim();
  if (!key) throw new Error("Add an API key in Settings first.");

  try {
    if (provider.kind === "gemini") {
      const model = input.model.replace(/^models\//, "");
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: input.prompt }] }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 400,
          },
        }),
      });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message = (payload as { error?: { message?: string } } | null)?.error?.message;
        throw new Error(message || `Gemini request failed (${response.status}).`);
      }
      return extractGeminiText(payload);
    }

    const base = (provider.defaultBaseUrl ?? "https://api.openai.com/v1").replace(/\/$/, "");
    const response = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: input.model,
        temperature: 0.4,
        max_tokens: 400,
        messages: [{ role: "user", content: input.prompt }],
      }),
    });
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const message = (payload as { error?: { message?: string } } | null)?.error?.message;
      throw new Error(message || `${provider.name} request failed (${response.status}).`);
    }
    return extractOpenAiText(payload);
  } catch (error) {
    if (error instanceof TypeError) throw new Error(corsHint(input.provider));
    throw error;
  }
}
