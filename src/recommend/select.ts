import type { DomainId, EstimatedBand, ProfileRecord, SenseRecord, UserWordRecord } from "../types";

const BAND_COMMONNESS: Record<EstimatedBand, { min: number; max: number }> = {
  emerging: { min: 55, max: 100 },
  developing: { min: 25, max: 90 },
  independent: { min: 0, max: 70 },
};

export function recommendationReason(sense: SenseRecord, saved: boolean, profile: ProfileRecord): string {
  if (saved) return "Saved by you";
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
  recentDomains: DomainId[],
): number {
  if (sense.selection === "calibration") return -1000;
  if (saved?.status === "known" || saved?.status === "paused") return -1000;
  if (saved?.usefulness === "already-know" || saved?.usefulness === "not-useful" || saved?.usefulness === "too-easy") {
    return -1000;
  }

  let score = 0;
  if (saved) score += 100;
  const band = profile.estimatedBand;
  const commonness = sense.frequency.commonness;
  if (band && commonness !== null) {
    const range = BAND_COMMONNESS[band];
    if (commonness >= range.min && commonness <= range.max) score += 20;
    else score -= 8;
  }
  if (sense.domains.some((domain) => profile.domains.includes(domain))) score += 12;
  if (commonness !== null) score += commonness / 20;
  if (recentDomains.includes(sense.domains[0])) score -= 6;
  return score;
}

export function pickNewSenses(
  senses: SenseRecord[],
  profile: ProfileRecord,
  savedWords: UserWordRecord[],
  alreadyCarded: Set<string>,
  limit: number,
): SenseRecord[] {
  const savedBySense = new Map(savedWords.map((word) => [word.senseId, word]));
  const recentDomains: DomainId[] = [];
  const ranked = senses
    .filter((sense) => !alreadyCarded.has(sense.id))
    .map((sense) => ({
      sense,
      score: scoreCandidate(sense, profile, savedBySense.get(sense.id), recentDomains),
    }))
    .filter((item) => item.score > -500)
    .sort((a, b) => b.score - a.score);

  const picked: SenseRecord[] = [];
  const usedHeads = new Set<string>();
  for (const item of ranked) {
    if (picked.length >= limit) break;
    if (usedHeads.has(item.sense.entryId) && !savedBySense.has(item.sense.id)) continue;
    picked.push(item.sense);
    usedHeads.add(item.sense.entryId);
    recentDomains.push(item.sense.domains[0]);
  }
  return picked;
}
