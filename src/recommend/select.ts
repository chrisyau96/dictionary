import type { EditorialBand, ProfileRecord, SenseRecord, UserWordRecord } from "../types";
import { isClosedClassSense } from "../content/synonyms";

const BAND_COMMONNESS: Record<EditorialBand, { min: number; max: number }> = {
  everyday: { min: 32, max: 72 },
  workplace: { min: 18, max: 55 },
  professional: { min: 8, max: 38 },
  specialist: { min: 0, max: 24 },
};

const BAND_SHIFT: Record<ProfileRecord["difficultyPreference"], number> = {
  none: 0,
  easier: -8,
  harder: 8,
};

export function effectiveBand(profile: ProfileRecord): EditorialBand {
  return profile.estimatedBand ?? "workplace";
}

export function isCompleteTeachingSense(sense: SenseRecord): boolean {
  return Boolean(
    sense.glossEn.trim() &&
      sense.glossTc.trim() &&
      sense.examples.length >= 1 &&
      sense.frequency.form,
  );
}

export function recommendationReason(sense: SenseRecord, saved: boolean, profile: ProfileRecord, struggled = false): string {
  if (saved) return "Saved by you";
  if (struggled) return "Practise using a word you recognize";
  const domain = sense.domains.find((item) => profile.domains.includes(item));
  if (domain === "project-management") return "Useful for project discussions";
  if (domain === "retail") return "Useful for shop and customer work";
  if (domain === "business") return "Useful for business communication";
  if (domain === "entrepreneurship") return "Useful for running a business";
  if (domain === "technology") return "Useful for technology work";
  return "Useful everyday English";
}

export function scoreCandidate(
  sense: SenseRecord,
  profile: ProfileRecord,
  saved: UserWordRecord | undefined,
  recentDomains: SenseRecord["domains"][number][],
  options: { struggled?: boolean; assessmentUnknown?: boolean } = {},
): number {
  if (!isCompleteTeachingSense(sense)) return -1000;
  if (sense.selection === "calibration") return -1000;
  if (saved?.membership === "removed") return -1000;
  if (saved?.recommend === "exclude") return -1000;
  if (saved?.status === "known") return -1000;
  if (saved?.usefulness === "already-know" || saved?.usefulness === "not-useful" || saved?.usefulness === "too-easy") {
    return -1000;
  }

  const isSaved = Boolean(saved && saved.membership === "active");
  if (!isSaved && isClosedClassSense(sense)) return -1000;
  const commonness = sense.frequency.commonness;
  if (!isSaved && commonness !== null && commonness >= 80) return -1000;

  let score = 0;
  if (isSaved) score += 100;
  if (options.assessmentUnknown) score += 22;
  if (options.struggled) score += 16;

  const band = effectiveBand(profile);
  const shift = BAND_SHIFT[profile.difficultyPreference];
  if (!isSaved && commonness !== null) {
    const range = BAND_COMMONNESS[band];
    const min = Math.max(0, range.min + shift);
    const max = Math.min(100, range.max + shift);
    if (commonness >= min && commonness <= max) score += 20;
    else if (commonness > max) score -= 14;
    else score -= 4;
  }

  if (sense.domains.some((domain) => profile.domains.includes(domain))) score += 12;
  if (recentDomains.includes(sense.domains[0])) score -= 6;
  return score;
}

export function pickNewSenses(
  senses: SenseRecord[],
  profile: ProfileRecord,
  savedWords: UserWordRecord[],
  alreadyCarded: Set<string>,
  limit: number,
  extra: { unknownSenseIds?: Set<string>; lapseSenseIds?: Set<string>; excludeSenseIds?: Set<string> } = {},
): SenseRecord[] {
  const savedBySense = new Map(savedWords.map((word) => [word.senseId, word]));
  const recentDomains: SenseRecord["domains"][number][] = [];
  const ranked = senses
    .filter((sense) => !alreadyCarded.has(sense.id))
    .filter((sense) => !extra.excludeSenseIds?.has(sense.id))
    .map((sense) => ({
      sense,
      saved: savedBySense.get(sense.id),
      score: scoreCandidate(sense, profile, savedBySense.get(sense.id), recentDomains, {
        struggled: extra.lapseSenseIds?.has(sense.id),
        assessmentUnknown: extra.unknownSenseIds?.has(sense.id),
      }),
    }))
    .filter((item) => item.score > -500)
    .sort((a, b) => b.score - a.score);

  const picked: SenseRecord[] = [];
  const usedHeads = new Set<string>();
  let savedTaken = 0;
  for (const item of ranked) {
    if (picked.length >= limit) break;
    const isSaved = Boolean(item.saved && item.saved.membership === "active");
    if (isSaved && savedTaken >= 2 && picked.length < limit) {
      // Keep room for gap items unless the remaining pool is only saved words.
      continue;
    }
    if (usedHeads.has(item.sense.entryId) && !isSaved) continue;
    picked.push(item.sense);
    usedHeads.add(item.sense.entryId);
    recentDomains.push(item.sense.domains[0]);
    if (isSaved) savedTaken += 1;
  }

  if (picked.length < limit) {
    for (const item of ranked) {
      if (picked.length >= limit) break;
      if (picked.some((sense) => sense.id === item.sense.id)) continue;
      if (usedHeads.has(item.sense.entryId) && !(item.saved && item.saved.membership === "active")) continue;
      picked.push(item.sense);
      usedHeads.add(item.sense.entryId);
    }
  }
  return picked;
}
