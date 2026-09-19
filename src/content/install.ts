import { db, ensureProfile } from "../db/database";
import { PACK_CATALOG, REQUIRED_PACK_ID, summarizePackOffers, type PackCatalogItem, type PackOffer } from "./packs";
import { sha256OfPackFile } from "./hash";
import { normalizeQuery } from "../search/normalize";
import { normalizeSenseSynonyms } from "./synonyms";
import type {
  AudioRecord,
  ContentPackRecord,
  EntryRecord,
  FormRecord,
  SenseRecord,
} from "../types";

export interface PackManifest {
  packId: string;
  version: string;
  schemaVersion: number;
  name: string;
  accent: string;
  entryCount: number;
  senseCount: number;
  audioCount: number;
  requiredAssets: string[];
  checksums: Record<string, string>;
  byteSize: number;
  audioBytes: number;
  completeness: ContentPackRecord["completeness"];
  licenses: string[];
}

export interface PackFile {
  schemaVersion: number;
  packId: string;
  version: string;
  name: string;
  accent: string;
  entries: Array<Omit<EntryRecord, "packId">>;
  senses: Array<Omit<SenseRecord, "packId" | "synonymStatus"> & { synonymStatus?: string }>;
  audio: Array<Omit<AudioRecord, "packId">>;
}

export interface InstallProgress {
  phase: string;
  current: number;
  total: number;
  message: string;
}

function packUrl(folder: string, path = ""): string {
  const base = `${import.meta.env.BASE_URL}packs/${folder}`;
  return path ? `${base}/${path}` : base;
}

export async function loadPackCatalog(): Promise<PackCatalogItem[]> {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}packs/index.json`);
    if (!response.ok) return [...PACK_CATALOG];
    const data = (await response.json()) as { packs?: PackCatalogItem[] };
    const packs = (data.packs ?? []).filter((item) => item.packId && item.folder);
    return packs.length ? packs : [...PACK_CATALOG];
  } catch {
    return [...PACK_CATALOG];
  }
}

export async function fetchManifest(folder = "chris-1000"): Promise<PackManifest> {
  const response = await fetch(packUrl(folder, "manifest.json"));
  if (!response.ok) throw new Error("Could not read the content pack list.");
  const manifest = (await response.json()) as PackManifest;
  if (manifest.schemaVersion !== 1) {
    throw new Error("This pack uses a newer schema than the app can install.");
  }
  return manifest;
}

async function fetchChecked(folder: string, path: string, expected: string): Promise<ArrayBuffer> {
  const response = await fetch(packUrl(folder, path));
  if (!response.ok) throw new Error(`Missing pack file: ${path}`);
  const buffer = await response.arrayBuffer();
  const digest = await sha256OfPackFile(path, buffer);
  if (digest !== expected) {
    throw new Error(`Checksum failed for ${path}. The download is incomplete or altered.`);
  }
  return buffer;
}

function formsForEntry(entry: EntryRecord): FormRecord[] {
  const seen = new Set<string>();
  return entry.searchableForms.flatMap((form) => {
    const normalized = normalizeQuery(form);
    if (!normalized || seen.has(normalized)) return [];
    seen.add(normalized);
    return [
      {
        id: `${entry.id}:${normalized}`,
        packId: entry.packId,
        form,
        normalized,
        entryId: entry.id,
        kind: normalizeQuery(entry.lemma) === normalized ? "lemma" : "inflection",
      },
    ];
  });
}

export async function loadPackOffers(): Promise<PackOffer[]> {
  const [catalog, installed] = await Promise.all([loadPackCatalog(), db.packs.toArray()]);
  const byId = new Map(installed.map((pack) => [pack.packId, pack]));
  const offers: PackOffer[] = [];
  for (const item of catalog) {
    const manifest = await fetchManifest(item.folder);
    const pack = byId.get(item.packId);
    const installedVersion = pack?.status === "installed" ? pack.version : null;
    const status: PackOffer["status"] = !installedVersion
      ? "missing"
      : installedVersion !== manifest.version
        ? "stale"
        : "current";
    offers.push({
      packId: item.packId,
      name: manifest.name,
      installedVersion,
      availableVersion: manifest.version,
      status,
    });
  }
  return offers;
}

export async function installPack(
  folder: string,
  onProgress: (progress: InstallProgress) => void,
): Promise<ContentPackRecord> {
  onProgress({ phase: "check", current: 0, total: 1, message: "Checking pack details…" });
  const manifest = await fetchManifest(folder);
  const existing = await db.packs.get(manifest.packId);
  if (existing?.status === "installed" && existing.version === manifest.version) {
    return existing;
  }

  const required = manifest.requiredAssets;
  onProgress({
    phase: "download",
    current: 0,
    total: required.length,
    message: `Downloading ${manifest.name}…`,
  });

  const packBuffer = await fetchChecked(folder, "pack.json", manifest.checksums["pack.json"]);
  onProgress({ phase: "download", current: 1, total: required.length, message: "Verified pack.json" });
  const pack = JSON.parse(new TextDecoder().decode(packBuffer)) as PackFile;
  if (pack.entries.length !== manifest.entryCount || pack.senses.length !== manifest.senseCount) {
    throw new Error("Pack counts do not match the manifest.");
  }

  await fetchChecked(folder, "NOTICES.md", manifest.checksums["NOTICES.md"]);

  const blobs: { id: string; blob: Blob; hash: string }[] = [];
  for (const [index, asset] of required.entries()) {
    if (!asset.startsWith("audio/")) continue;
    const expected = manifest.checksums[asset];
    const buffer = await fetchChecked(folder, asset, expected);
    const audioId = asset.replace("audio/", "").replace(".mp3", "");
    blobs.push({
      id: audioId,
      blob: new Blob([buffer], { type: "audio/mpeg" }),
      hash: expected,
    });
    onProgress({
      phase: "download",
      current: index + 1,
      total: required.length,
      message: `Verified ${asset}`,
    });
  }

  if (blobs.length !== manifest.audioCount) {
    throw new Error("Audio coverage does not match the pack declaration.");
  }

  onProgress({ phase: "import", current: 0, total: 1, message: "Saving to this device…" });

  const packId = pack.packId;
  const entries: EntryRecord[] = pack.entries.map((entry) => ({ ...entry, packId }));
  const senses: SenseRecord[] = pack.senses.map((sense) => normalizeSenseSynonyms({ ...sense, packId }));
  const audio: AudioRecord[] = pack.audio.map((item) => ({ ...item, packId }));
  const forms = entries.flatMap(formsForEntry);

  const record: ContentPackRecord = {
    packId,
    version: pack.version,
    schemaVersion: pack.schemaVersion,
    name: pack.name,
    accent: pack.accent,
    entryCount: pack.entries.length,
    senseCount: pack.senses.length,
    audioCount: pack.audio.length,
    status: "installed",
    installedAt: new Date().toISOString(),
    checksums: manifest.checksums,
    completeness: manifest.completeness,
  };

  await db.transaction(
    "rw",
    [db.packs, db.entries, db.senses, db.forms, db.audio, db.audioBlobs, db.profile],
    async () => {
      const oldAudio = await db.audio.where("packId").equals(packId).toArray();
      await db.entries.where("packId").equals(packId).delete();
      await db.senses.where("packId").equals(packId).delete();
      await db.forms.where("packId").equals(packId).delete();
      await db.audio.where("packId").equals(packId).delete();
      if (oldAudio.length) await db.audioBlobs.bulkDelete(oldAudio.map((item) => item.id));
      await db.packs.delete(packId);
      await db.entries.bulkPut(entries);
      await db.senses.bulkPut(senses);
      await db.forms.bulkPut(forms);
      await db.audio.bulkPut(audio);
      await db.audioBlobs.bulkPut(blobs);
      await db.packs.put(record);
      await ensureProfile();
    },
  );

  onProgress({ phase: "ready", current: 1, total: 1, message: `${manifest.name} is ready.` });
  return record;
}

export async function installFoundationPack(
  onProgress: (progress: InstallProgress) => void,
): Promise<ContentPackRecord> {
  const catalog = await loadPackCatalog();
  const required = catalog.find((item) => item.packId === REQUIRED_PACK_ID) ?? PACK_CATALOG[0];
  return installPack(required.folder, onProgress);
}

export async function installPendingPacks(
  pending: PackOffer[],
  onProgress: (progress: InstallProgress) => void,
): Promise<void> {
  const catalog = await loadPackCatalog();
  const targets = pending.length
    ? pending
    : catalog.map((item) => ({
        packId: item.packId,
        name: "",
        installedVersion: null,
        availableVersion: "",
        status: "missing" as const,
      }));
  for (const item of targets) {
    const folder = catalog.find((entry) => entry.packId === item.packId)?.folder;
    if (!folder) continue;
    await installPack(folder, onProgress);
  }
}

export async function loadPackSummary() {
  return summarizePackOffers(await loadPackOffers());
}

export async function requestPersistentStorage(): Promise<boolean | null> {
  if (!navigator.storage?.persist) return null;
  try {
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

export async function storageSnapshot(): Promise<{ persisted: boolean | null; usage: number | null; quota: number | null }> {
  let persisted: boolean | null = null;
  let usage: number | null = null;
  let quota: number | null = null;
  try {
    persisted = navigator.storage?.persisted ? await navigator.storage.persisted() : null;
  } catch {
    persisted = null;
  }
  try {
    const estimate = navigator.storage?.estimate ? await navigator.storage.estimate() : null;
    usage = estimate?.usage ?? null;
    quota = estimate?.quota ?? null;
  } catch {
    usage = null;
  }
  return { persisted, usage, quota };
}
