import { escapeHtml, toSafeHtml } from "./html";

export type AiProviderId = "openai" | "google" | "deepseek" | "mistral";

export interface AiProvider {
  id: AiProviderId;
  name: string;
  catalogId: string;
  kind: "openai-chat" | "gemini";
  docs: string;
  keyHint: string;
  defaultBaseUrl?: string;
}

export const AI_PROVIDERS: AiProvider[] = [
  {
    id: "openai",
    name: "OpenAI",
    catalogId: "openai",
    kind: "openai-chat",
    docs: "https://platform.openai.com/api-keys",
    keyHint: "sk-…",
    defaultBaseUrl: "https://api.openai.com/v1",
  },
  {
    id: "google",
    name: "Gemini",
    catalogId: "google",
    kind: "gemini",
    docs: "https://aistudio.google.com/apikey",
    keyHint: "AIza…",
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    catalogId: "deepseek",
    kind: "openai-chat",
    docs: "https://platform.deepseek.com/api_keys",
    keyHint: "sk-…",
    defaultBaseUrl: "https://api.deepseek.com",
  },
  {
    id: "mistral",
    name: "Mistral AI",
    catalogId: "mistral",
    kind: "openai-chat",
    docs: "https://console.mistral.ai/api-keys",
    keyHint: "…",
    defaultBaseUrl: "https://api.mistral.ai/v1",
  },
];

export function providerById(id: string | null | undefined): AiProvider {
  return AI_PROVIDERS.find((item) => item.id === id) ?? AI_PROVIDERS[1];
}

export const FALLBACK_MODELS: Record<AiProviderId, Array<{ id: string; name: string }>> = {
  openai: [
    { id: "gpt-4.1-nano", name: "GPT-4.1 nano" },
    { id: "gpt-4o-mini", name: "GPT-4o mini" },
    { id: "gpt-4.1-mini", name: "GPT-4.1 mini" },
  ],
  google: [
    { id: "gemini-2.5-flash-lite", name: "Gemini 2.5 Flash-Lite" },
    { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash" },
    { id: "gemini-flash-lite-latest", name: "Gemini Flash-Lite Latest" },
  ],
  deepseek: [
    { id: "deepseek-flash", name: "DeepSeek V4.1 Flash" },
    { id: "deepseek-chat", name: "DeepSeek Chat" },
  ],
  mistral: [
    { id: "ministral-8b-latest", name: "Ministral 8B" },
    { id: "mistral-small-latest", name: "Mistral Small" },
    { id: "ministral-3b-latest", name: "Ministral 3B" },
  ],
};

export const DEFAULT_AI_PROMPTS: Array<{ label: string; ask: string }> = [
  {
    label: "Connotation",
    ask: "What is the connotation? Positive, negative, or neutral — one short line.",
  },
  {
    label: "Synonym & antonym",
    ask: "Give 2 close synonyms and 2 antonyms, each with a 3-word difference.",
  },
  {
    label: "Help me remember this",
    ask: "Give one short mnemonic or tiny story to remember this word.",
  },
  {
    label: "Word history",
    ask: "Give a one-sentence origin or history of this word.",
  },
  {
    label: "Nearby words & differences",
    ask: "List 3 nearby words and how they differ, each with one short example.",
  },
];

export function buildAiPrompt(_word: string, ask: string): string {
  return ask.trim();
}

export function cleanCommand(command: string): string {
  const preset = DEFAULT_AI_PROMPTS.find((item) => item.label === command || item.ask === command);
  if (preset) return preset.label;
  const compact = command.replace(/[\n:]/g, " ").replace(/\s+/g, " ").trim();
  return compact.slice(0, 48) || "Note";
}

export function formatAiNote(command: string, answer: string): string {
  const title = escapeHtml(cleanCommand(command));
  const body = toSafeHtml(answer);
  return `<p><strong>${title}</strong></p>${body}`;
}

export function rememberCommand(recent: string[], command: string): string[] {
  const next = command.replace(/\s+/g, " ").trim();
  if (!next) return recent.slice(0, 3);
  return [next, ...recent.filter((item) => item.toLowerCase() !== next.toLowerCase())].slice(0, 3);
}

export function suggestedCommands(recent: string[]): string[] {
  const defaults = DEFAULT_AI_PROMPTS.map((item) => item.label);
  const extra = recent.filter((item) => !defaults.some((label) => label.toLowerCase() === item.toLowerCase()));
  return [...extra, ...defaults];
}
