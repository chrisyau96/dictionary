import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { PACK_CATALOG, REQUIRED_PACK_ID } from "./packs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

function readJson<T>(relative: string): T {
  return JSON.parse(readFileSync(resolve(root, relative), "utf8")) as T;
}

interface PackFile {
  packId: string;
  version: string;
  entries: Array<{ id: string; lemma: string }>;
  senses: Array<{
    id: string;
    entryId: string;
    glossEn: string;
    glossTc: string;
    examples: unknown[];
    synonyms: unknown[];
    pronunciationId: string;
  }>;
  audio: unknown[];
}

interface ManifestFile {
  packId: string;
  version: string;
  entryCount: number;
  senseCount: number;
  audioCount: number;
  checksums: Record<string, string>;
}

describe("common-5000 lookup pack", () => {
  const catalog = readJson<{ packs: Array<{ packId: string; folder: string }> }>("public/packs/index.json");
  const chris = readJson<PackFile>("public/packs/chris-1000/pack.json");
  const pack = readJson<PackFile>("public/packs/common-5000/pack.json");
  const manifest = readJson<ManifestFile>("public/packs/common-5000/manifest.json");

  it("is listed next to the workplace pack and is not the required teaching pack", () => {
    expect(REQUIRED_PACK_ID).toBe("chris-1000");
    expect(PACK_CATALOG.map((item) => item.packId)).toEqual(["chris-1000", "common-5000"]);
    expect(catalog.packs.map((item) => item.packId)).toEqual(["chris-1000", "common-5000"]);
  });

  it("covers the wordfreq top 5,000 without duplicating workplace lemmas", () => {
    const lemmas = pack.entries.map((entry) => entry.lemma.toLowerCase());
    const chrisLemmas = new Set(chris.entries.map((entry) => entry.lemma.toLowerCase()));
    expect(pack.packId).toBe("common-5000");
    expect(pack.entries).toHaveLength(manifest.entryCount);
    expect(pack.senses).toHaveLength(manifest.senseCount);
    expect(manifest.entryCount).toBeGreaterThanOrEqual(4500);
    expect(new Set(lemmas).size).toBe(lemmas.length);
    expect(lemmas.some((lemma) => chrisLemmas.has(lemma))).toBe(false);
    expect(lemmas).toContain("because");
    expect(lemmas).toContain("said");
    expect(lemmas).not.toContain("deadline");
  });

  it("stays a lookup layer: glosses only, no audio, examples, or invented synonyms", () => {
    expect(pack.audio).toEqual([]);
    expect(manifest.audioCount).toBe(0);
    expect(pack.senses.every((sense) => sense.examples.length === 0)).toBe(true);
    expect(pack.senses.every((sense) => sense.synonyms.length === 0)).toBe(true);
    expect(pack.senses.every((sense) => sense.glossEn.trim() && sense.glossTc.trim())).toBe(true);
    const said = pack.senses.find((sense) => sense.id === "s-c5-said");
    expect(said?.glossEn).toMatch(/past form of say/i);
    expect(said?.glossTc).not.toMatch(/具|勢態/);
  });
});
