import { FALLBACK_MODELS, type AiProviderId } from "./types";

const CATALOG_URL = "https://models.dev/api.json";
const SKIP = /tts|image|live|veo|lyria|voxtral|embed|whisper|realtime|omni|audio|vision/i;
const FAST = /mini|nano|flash|lite|small|ministral|nemo|4o-mini|3\.5-turbo|deepseek-chat|deepseek-flash/i;

export interface CatalogModel {
  id: string;
  name: string;
  reasoning: boolean;
}

interface RawModel {
  id?: string;
  name?: string;
  reasoning?: boolean;
  modalities?: { input?: string[]; output?: string[] };
  cost?: { input?: number; output?: number };
}

interface RawProvider {
  models?: Record<string, RawModel>;
}

export function pickFastModels(raw: Record<string, RawModel> | undefined, fallback: CatalogModel[]): CatalogModel[] {
  const rows: Array<CatalogModel & { cost: number; fast: boolean }> = [];
  for (const [id, model] of Object.entries(raw ?? {})) {
    if (SKIP.test(id) || SKIP.test(model.name ?? "")) continue;
    const input = model.modalities?.input ?? [];
    const output = model.modalities?.output ?? [];
    if (!input.includes("text") || !output.includes("text")) continue;
    const cost = (model.cost?.input ?? 50) + (model.cost?.output ?? 50);
    rows.push({
      id: model.id || id,
      name: model.name || id,
      reasoning: Boolean(model.reasoning),
      cost,
      fast: FAST.test(id) || FAST.test(model.name ?? ""),
    });
  }
  rows.sort((a, b) => Number(b.fast) - Number(a.fast) || Number(a.reasoning) - Number(b.reasoning) || a.cost - b.cost);
  const picked = rows.slice(0, 4).map(({ id, name, reasoning }) => ({ id, name, reasoning }));
  return picked.length ? picked : fallback;
}

export async function loadProviderModels(provider: AiProviderId): Promise<CatalogModel[]> {
  const fallback = FALLBACK_MODELS[provider].map((item) => ({ ...item, reasoning: false }));
  try {
    const response = await fetch(CATALOG_URL);
    if (!response.ok) return fallback;
    const catalog = (await response.json()) as Record<string, RawProvider>;
    const catalogId = provider === "google" ? "google" : provider;
    return pickFastModels(catalog[catalogId]?.models, fallback);
  } catch {
    return fallback;
  }
}
