import { providerById, type AiProviderId } from "./types";

export const AI_USER_ERROR = "An error occurred. Please try again.";

export function hiddenWordPrompt(word: string): string {
  return [
    `Base your answer on the English word "${word}" only.`,
    "Answer only, as concise as possible.",
    "Do not repeat the word as a heading.",
    "Use simple HTML: p, strong, em, ul, ol, li, br.",
    "Use ul/ol lists for nearby words, synonyms, or numbered points. Nest lists instead of using markdown.",
    "No markdown markers, no empty list items, no preamble.",
    "Always return at least one HTML paragraph with visible text.",
  ].join(" ");
}

function nonempty(text: string | undefined): string {
  const value = text?.trim() ?? "";
  if (!value) throw new Error(AI_USER_ERROR);
  return value;
}

function extractOpenAiText(payload: unknown): string {
  const message = (payload as { choices?: Array<{ message?: { content?: string | Array<{ text?: string }> } }> }).choices?.[0]
    ?.message;
  const raw = message?.content;
  const content = Array.isArray(raw)
    ? raw.map((part) => part.text ?? "").join("").trim()
    : raw?.trim() ?? "";
  return nonempty(content);
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
  if (data.promptFeedback?.blockReason) throw new Error(AI_USER_ERROR);
  const candidate = data.candidates?.[0];
  const parts = candidate?.content?.parts ?? [];
  const visible = parts
    .filter((part) => !part.thought)
    .map((part) => part.text ?? "")
    .join("")
    .trim();
  if (visible) return visible;
  const anyText = parts.map((part) => part.text ?? "").join("").trim();
  if (anyText) return anyText;
  throw new Error(AI_USER_ERROR);
}

function corsHint(_provider: AiProviderId): string {
  return AI_USER_ERROR;
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
        temperature: 0.2,
        maxOutputTokens: 8192,
        thinkingConfig: { thinkingBudget: 0, includeThoughts: false },
      },
    },
    {
      systemInstruction: { parts: [{ text: hiddenWordPrompt(word) }] },
      contents: [{ role: "user", parts: [{ text: `${ask}\n\nReply with at least one short HTML paragraph. Do not leave the answer empty.` }] }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 4096,
      },
    },
  ];

  for (const body of attempts) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      if (response.status === 400) continue;
      throw new Error(AI_USER_ERROR);
    }
    try {
      return extractGeminiText(payload);
    } catch {
      continue;
    }
  }
  throw new Error(AI_USER_ERROR);
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
  if (!key) throw new Error(AI_USER_ERROR);
  const ask = input.ask.trim();
  if (!ask) throw new Error(AI_USER_ERROR);

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
    if (!response.ok) throw new Error(AI_USER_ERROR);
    return extractOpenAiText(payload);
  } catch (error) {
    if (error instanceof TypeError) throw new Error(corsHint(input.provider));
    throw error instanceof Error ? error : new Error(AI_USER_ERROR);
  }
}
