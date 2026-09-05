import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../db/database";
import { normalizeQuery } from "./normalize";
import { searchDictionary } from "./lookup";

describe("dictionary search", () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    await db.entries.bulkPut([
      { id: "e-saw", packId: "p", lemma: "saw", display: "saw", pos: ["noun"], searchableForms: ["saw"], domains: ["everyday"] },
      { id: "e-see", packId: "p", lemma: "see", display: "see", pos: ["verb"], searchableForms: ["see", "saw", "seen"], domains: ["everyday"] },
      { id: "e-streamline", packId: "p", lemma: "streamline", display: "streamline", pos: ["verb"], searchableForms: ["streamline", "streamlined"], domains: ["business"] },
    ]);
    await db.senses.bulkPut([
      { id: "s-saw-tool", entryId: "e-saw", packId: "p", pos: "noun", ipa: "/sɔː/", pronunciationId: "p-saw", glossEn: "tool", glossTc: "鋸", usageNote: null, domains: ["everyday"], examples: [], synonyms: [], synonymStatus: "not_prepared", collocations: [], frequency: { form: "saw", zipf: 5.34, commonness: 74, source: "wordfreq", sourceVersion: "3.1.1", scaleVersion: "v1", status: "measured" }, selection: "learn" },
      { id: "s-see-past", entryId: "e-see", packId: "p", pos: "verb", ipa: "/sɔː/", pronunciationId: "p-saw", glossEn: "past of see", glossTc: "看見", usageNote: null, domains: ["everyday"], examples: [], synonyms: [], synonymStatus: "not_prepared", collocations: [], frequency: { form: "saw", zipf: 5.34, commonness: 74, source: "wordfreq", sourceVersion: "3.1.1", scaleVersion: "v1", status: "measured" }, selection: "learn" },
      { id: "s-streamline", entryId: "e-streamline", packId: "p", pos: "verb", ipa: "/ˈstriːmlaɪn/", pronunciationId: "p-streamline", glossEn: "simplify a process", glossTc: "精簡", usageNote: null, domains: ["business"], examples: [], synonyms: [{ term: "simplify", relation: "near", difference: "not always interchangeable" }], synonymStatus: "available", collocations: [], frequency: { form: "streamline", zipf: 3.18, commonness: 26, source: "wordfreq", sourceVersion: "3.1.1", scaleVersion: "v1", status: "measured" }, selection: "learn" },
    ]);
    await db.forms.bulkPut([
      { id: "1", packId: "p", form: "saw", normalized: "saw", entryId: "e-saw", kind: "lemma" },
      { id: "2", packId: "p", form: "saw", normalized: "saw", entryId: "e-see", kind: "inflection" },
      { id: "3", packId: "p", form: "see", normalized: "see", entryId: "e-see", kind: "lemma" },
      { id: "4", packId: "p", form: "streamline", normalized: "streamline", entryId: "e-streamline", kind: "lemma" },
      { id: "5", packId: "p", form: "streamlined", normalized: "streamlined", entryId: "e-streamline", kind: "inflection" },
    ]);
  });

  it("normalizes capitalization and unicode space", () => {
    expect(normalizeQuery("  SAW  ")).toBe("saw");
    expect(normalizeQuery("cash\u00a0flow")).toBe("cash flow");
  });

  it("does not collapse ambiguous saw into one headword", async () => {
    const hits = await searchDictionary("SAW");
    const ids = hits.map((hit) => hit.entry.id).sort();
    expect(ids).toEqual(["e-saw", "e-see"]);
  });

  it("finds inflections and prefixes", async () => {
    const inflection = await searchDictionary("streamlined");
    expect(inflection[0]?.entry.id).toBe("e-streamline");
    const prefix = await searchDictionary("strea");
    expect(prefix[0]?.entry.id).toBe("e-streamline");
  });
});
