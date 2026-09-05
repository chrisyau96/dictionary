import { db } from "../db/database";
import type { EntryRecord, SenseRecord } from "../types";
import { normalizeQuery } from "./normalize";

export interface SearchHit {
  entry: EntryRecord;
  senses: SenseRecord[];
  matchKind: "exact-form" | "headword" | "prefix";
  matchedForm: string;
}

export async function searchDictionary(rawQuery: string, limit = 20): Promise<SearchHit[]> {
  const query = normalizeQuery(rawQuery);
  if (!query) return [];

  const forms = await db.forms.where("normalized").equals(query).toArray();
  const prefixForms =
    query.length >= 2
      ? await db.forms.where("normalized").startsWith(query).limit(40).toArray()
      : [];

  const grouped = new Map<string, SearchHit>();

  const add = async (entryId: string, matchedForm: string, matchKind: SearchHit["matchKind"]) => {
    if (grouped.has(entryId)) return;
    const entry = await db.entries.get(entryId);
    if (!entry) return;
    const senses = await db.senses.where("entryId").equals(entryId).toArray();
    grouped.set(entryId, { entry, senses, matchKind, matchedForm });
  };

  for (const form of forms) {
    const kind = form.kind === "lemma" && form.normalized === normalizeQuery(form.form) ? "headword" : "exact-form";
    await add(form.entryId, form.form, form.kind === "lemma" ? "headword" : kind);
  }

  if (forms.length === 0) {
    for (const form of prefixForms) {
      await add(form.entryId, form.form, "prefix");
      if (grouped.size >= limit) break;
    }
  } else {
    for (const form of prefixForms) {
      if (grouped.has(form.entryId)) continue;
      await add(form.entryId, form.form, "prefix");
      if (grouped.size >= limit) break;
    }
  }

  return [...grouped.values()].slice(0, limit);
}

export function groupSensesByPos(senses: SenseRecord[]): Map<string, SenseRecord[]> {
  const groups = new Map<string, SenseRecord[]>();
  for (const sense of senses) {
    const list = groups.get(sense.pos) ?? [];
    list.push(sense);
    groups.set(sense.pos, list);
  }
  return groups;
}
