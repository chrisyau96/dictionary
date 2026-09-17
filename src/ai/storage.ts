import { db } from "../db/database";
import { providerById, type AiProviderId } from "./types";

export interface AiConfig {
  provider: AiProviderId;
  model: string;
  recentPrompts: string[];
}

const CONFIG_KEY = "ai-config";

function keyId(provider: AiProviderId): string {
  return `ai-key:${provider}`;
}

export async function loadAiConfig(): Promise<AiConfig | null> {
  const row = await db.meta.get(CONFIG_KEY);
  const value = row?.value as Partial<AiConfig> | undefined;
  if (!value?.provider || !value.model) return null;
  return {
    provider: value.provider,
    model: value.model,
    recentPrompts: Array.isArray(value.recentPrompts) ? value.recentPrompts.slice(0, 3) : [],
  };
}

export async function saveAiConfig(config: AiConfig): Promise<void> {
  await db.meta.put({ key: CONFIG_KEY, value: config });
}

export async function loadApiKey(provider: AiProviderId): Promise<string> {
  const row = await db.meta.get(keyId(provider));
  const value = row?.value as { apiKey?: string } | undefined;
  return value?.apiKey?.trim() ?? "";
}

export async function saveApiKey(provider: AiProviderId, apiKey: string): Promise<void> {
  const trimmed = apiKey.trim();
  if (!trimmed) {
    await db.meta.delete(keyId(provider));
    return;
  }
  await db.meta.put({ key: keyId(provider), value: { apiKey: trimmed } });
}

export async function clearApiKey(provider: AiProviderId): Promise<void> {
  await db.meta.delete(keyId(provider));
}

export async function hasAiReady(): Promise<boolean> {
  const config = await loadAiConfig();
  if (!config) return false;
  const key = await loadApiKey(config.provider);
  return Boolean(key);
}

export async function maskedKey(provider: AiProviderId): Promise<string> {
  const key = await loadApiKey(provider);
  if (!key) return "";
  if (key.length <= 8) return "••••";
  return `${"•".repeat(8)}${key.slice(-4)}`;
}

export function providerLabel(id: AiProviderId): string {
  return providerById(id).name;
}
