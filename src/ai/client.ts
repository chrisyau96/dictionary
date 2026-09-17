import { providerById, type AiProviderId } from "./types";

export function hiddenWordPrompt(word: string): string {
  return [
    `Base your answer on the English word "${word}" only.`,
    "Answer only, as concise as possible.",
    "Use simple HTML: p, strong, em, ul, li, br. No markdown. No preamble.",
  ].join(" ");
}

function extractOpenAiText(payload: unknown): string {
  const message = (payload as { choices?: Array<{ message?: { content?: string | Array<{ text?: string }> } }> }).choices?.[0]
    ?.message;
  const raw = message?.content;
  const content = Array.isArray(raw)
    ? raw.map((part) => part.text ?? "").join("").trim()
    : raw?.trim() ?? "";
  if (!content) throw new Error("The model returned an empty answer.");
  return content;
}

export function extractGeminiText(payload: unknown): string {
  const data = payload as {
    promptFeedback?: { blockReason?: string };
    error?: { message?: string };
    candidates?: Array<{
      finishReason?: string;
      content?: { parts?: Array<{ text?: string; thought?: boolean }> };
    }>;
  };
  if (data.promptFeedback?.blockReason) {
    throw new Error(`Gemini blocked this (${data.promptFeedback.blockReason}).`);
  }
  const candidate = data.candidates?.[0];
  const parts = candidate?.content?.parts ?? [];
  const visible = parts
    .filter((part) => !part.thought)
    .map((part) => part.text ?? "")
    .join("")
    .trim();
  if (visible) return visible;
  // Flash-Lite often spends the whole budget on thought parts. Prefer that
  // text over a blank sheet if the model never emitted a visible part.
  const anyText = parts.map((part) => part.text ?? "").join("").trim();
  if (anyText) return anyText;
  const finish = candidate?.finishReason;
  if (finish === "MAX_TOKENS") {
    throw new Error("The model used its token budget before answering. Try Ask again, or pick Gemini 2.5 Flash in Settings.");
  }
  if (finish === "SAFETY" || finish === "RECITATION") {
    throw new Error("Gemini blocked this answer.");
  }
  throw new Error("The model returned an empty answer. Try Ask again.");
}

function corsHint(provider: AiProviderId): string {
  if (provider === "google") return "Check the Gemini API key and try again.";
  return "This provider may block browser calls. Gemini usually works on this phone. You can also paste a key in Settings.";
}

async function geminiComplete(model: string, apiKey: string, word: string, ask: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model.replace(/^models\//, ""))}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const base = {
    systemInstruction: { parts: [{ text: hiddenWordPrompt(word) }] },
    contents: [{ role: "user", parts: [{ text: ask }] }],
  };
  const attempts = [
    {
      ...base,
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2048,
        thinkingConfig: { thinkingBudget: 0, includeThoughts: false },
      },
    },
    {
      ...base,
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 8192,
      },
    },
  ];

  let lastError = "Gemini request failed.";
  for (const body of attempts) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      lastError = (payload as { error?: { message?: string } } | null)?.error?.message || `Gemini request failed (${response.status}).`;
      if (response.status === 400) continue;
      throw new Error(lastError);
    }
    try {
      return extractGeminiText(payload);
    } catch (error) {
      lastError = error instanceof Error ? error.message : lastError;
    }
  }
  throw new Error(lastError);
}

export async function completeChat(input: {
  provider: AiProviderId;
  model: string;
  apiKey: string;
  word: string;
  ask: string;
}): Promise<string> {
  const provider = providerById(input.provider);
  const key = input.apiKey.trim();
  if (!key) throw new Error("Add an API key in Settings first.");
  const ask = input.ask.trim();
  if (!ask) throw new Error("Type a question first.");

  try {
    if (provider.kind === "gemini") {
      return await geminiComplete(input.model, key, input.word, ask);
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
        temperature: 0.3,
        max_tokens: 800,
        messages: [
          { role: "system", content: hiddenWordPrompt(input.word) },
          { role: "user", content: ask },
        ],
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
