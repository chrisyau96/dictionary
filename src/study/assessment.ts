import { db, ensureProfile } from "../db/database";
import { ASSESSMENT_BANK_VERSION, type AssessmentOutcome, type AssessmentResponse, type AssessmentResult, type AssessmentSessionRecord, type EditorialBand } from "../types";
import { ASSESSMENT_ITEMS, itemsById, type AssessmentItem } from "./assessmentItems";

export const BANDS: EditorialBand[] = ["everyday", "workplace", "professional", "specialist"];

export function bandLabel(band: EditorialBand): string {
  if (band === "everyday") return "everyday workplace English";
  if (band === "workplace") return "practical workplace English";
  if (band === "professional") return "precise professional English";
  return "stretch / specialist vocabulary";
}

export function bandIndex(band: EditorialBand): number {
  return BANDS.indexOf(band);
}

export function clampBand(index: number): EditorialBand {
  return BANDS[Math.max(0, Math.min(BANDS.length - 1, index))];
}

export function normalizeTyped(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]+/gu, "")
    .replace(/\s+/g, " ");
}

export function scoreTyped(item: AssessmentItem, typed: string): AssessmentOutcome {
  const needle = normalizeTyped(typed);
  if (!needle) return "unknown";
  const accepted = [item.correct, ...(item.accepted ?? [])].map(normalizeTyped);
  return accepted.includes(needle) ? "correct" : "incorrect";
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function optionOrderFor(item: AssessmentItem): string[] | undefined {
  if (!item.options?.length) return undefined;
  return shuffle(item.options);
}

function pickFromBand(
  band: EditorialBand,
  skill: AssessmentItem["skill"] | null,
  phase: AssessmentItem["phase"] | null,
  used: Set<string>,
  count: number,
): AssessmentItem[] {
  const pool = ASSESSMENT_ITEMS.filter((item) => {
    if (used.has(item.id)) return false;
    if (item.band !== band) return false;
    if (skill && item.skill !== skill) return false;
    if (phase && item.phase !== phase) return false;
    return true;
  });
  return shuffle(pool).slice(0, count);
}

function pickAroundBand(band: EditorialBand, phase: AssessmentItem["phase"], skill: AssessmentItem["skill"] | null, used: Set<string>, count: number): AssessmentItem[] {
  const idx = bandIndex(band);
  const order = [band, clampBand(idx - 1), clampBand(idx + 1), ...BANDS];
  const picked: AssessmentItem[] = [];
  for (const candidate of order) {
    if (picked.length >= count) break;
    picked.push(...pickFromBand(candidate, skill, phase, used, count - picked.length));
    picked.forEach((item) => used.add(item.id));
  }
  if (picked.length < count) {
    const extra = ASSESSMENT_ITEMS.filter((item) => !used.has(item.id) && (!skill || item.skill === skill));
    for (const item of shuffle(extra)) {
      if (picked.length >= count) break;
      picked.push(item);
      used.add(item.id);
    }
  }
  return picked.slice(0, count);
}

export function routeAfterBlock(current: EditorialBand, outcomes: AssessmentOutcome[]): EditorialBand {
  const correct = outcomes.filter((item) => item === "correct").length;
  if (correct >= 4) return clampBand(bandIndex(current) + 1);
  if (correct <= 2) return clampBand(bandIndex(current) - 1);
  return current;
}

export function buildAssessmentQueue(startBand: EditorialBand = "workplace"): AssessmentItem[] {
  const used = new Set<string>();
  const idx = bandIndex(startBand);
  const routingBands: EditorialBand[] = [
    clampBand(idx),
    clampBand(idx),
    clampBand(idx - 1),
    clampBand(idx + 1),
    clampBand(idx),
    clampBand(idx - 1),
    clampBand(idx + 1),
    clampBand(idx),
  ];
  const routing: AssessmentItem[] = [];
  for (const band of routingBands) {
    const next = pickFromBand(band, "recognition", "routing", used, 1)[0]
      ?? pickFromBand(band, "recognition", "understanding", used, 1)[0];
    if (next) {
      routing.push(next);
      used.add(next.id);
    }
  }
  const understanding = pickAroundBand(startBand, "understanding", "recognition", used, 16);
  const production = pickAroundBand(startBand, "use", "production", used, 8);
  return [...routing, ...understanding, ...production].slice(0, 32);
}

export function maybeExtendQueue(
  items: AssessmentItem[],
  responses: AssessmentResponse[],
): AssessmentItem[] {
  if (items.length >= 40) return items;
  const rec = bandFromSkill(responses, "recognition");
  const prod = bandFromSkill(responses, "production");
  const conflict = Math.abs(bandIndex(rec) - bandIndex(prod)) >= 2;
  const boundary = majorityBand(responses);
  const atBoundary = responses.filter((item) => item.band === boundary).length;
  if (!conflict && atBoundary >= 6) return items;
  const used = new Set(items.map((item) => item.id));
  const extraPhase: AssessmentItem["phase"] = conflict ? "use" : "understanding";
  const extraSkill = conflict ? "production" : null;
  const extra = pickAroundBand(boundary, extraPhase, extraSkill, used, Math.min(8, 40 - items.length));
  return [...items, ...extra];
}

function majorityBand(responses: AssessmentResponse[]): EditorialBand {
  const tallies: Record<EditorialBand, { correct: number; total: number }> = {
    everyday: { correct: 0, total: 0 },
    workplace: { correct: 0, total: 0 },
    professional: { correct: 0, total: 0 },
    specialist: { correct: 0, total: 0 },
  };
  for (const response of responses) {
    tallies[response.band].total += 1;
    if (response.outcome === "correct") tallies[response.band].correct += 1;
  }
  let best: EditorialBand = "workplace";
  let bestScore = -1;
  for (const band of BANDS) {
    if (!tallies[band].total) continue;
    const score = tallies[band].correct / tallies[band].total;
    if (score > bestScore) {
      best = band;
      bestScore = score;
    }
  }
  return best;
}

function bandFromSkill(responses: AssessmentResponse[], skill: AssessmentResponse["skill"]): EditorialBand {
  const subset = responses.filter((item) => item.skill === skill);
  if (subset.length < 3) return majorityBand(responses);
  const byBand = BANDS.map((band) => {
    const rows = subset.filter((item) => item.band === band);
    const total = rows.length;
    const correct = rows.filter((item) => item.outcome === "correct").length;
    return { band, rate: total ? correct / total : -1, total };
  });
  const usable = byBand.filter((row) => row.total > 0);
  if (!usable.length) return "workplace";
  const strong = [...usable].sort((a, b) => b.rate - a.rate || b.total - a.total)[0];
  if (strong.rate >= 0.75) return strong.band;
  const weakestStillTried = [...usable].sort((a, b) => a.rate - b.rate)[0];
  if (weakestStillTried.rate <= 0.4) return clampBand(bandIndex(weakestStillTried.band) - 1);
  return strong.band;
}

export function evaluateAssessment(responses: AssessmentResponse[]): AssessmentResult {
  const sampledByBand: AssessmentResult["sampledByBand"] = {
    everyday: { correct: 0, total: 0 },
    workplace: { correct: 0, total: 0 },
    professional: { correct: 0, total: 0 },
    specialist: { correct: 0, total: 0 },
  };
  for (const response of responses) {
    sampledByBand[response.band].total += 1;
    if (response.outcome === "correct") sampledByBand[response.band].correct += 1;
  }
  const recognition = responses.filter((item) => item.skill === "recognition");
  const production = responses.filter((item) => item.skill === "production");
  const recognitionBand = bandFromSkill(responses, "recognition");
  const productionBand = bandFromSkill(responses, "production");
  const recommendedBand =
    bandIndex(productionBand) < bandIndex(recognitionBand) ? productionBand : recognitionBand;
  const coverage: AssessmentResult["coverage"] =
    responses.length >= 24 && recognition.length >= 12 && production.length >= 6 ? "adequate" : "provisional";
  const recRate = recognition.length ? recognition.filter((item) => item.outcome === "correct").length / recognition.length : 0;
  const prodRate = production.length ? production.filter((item) => item.outcome === "correct").length / production.length : 0;
  let note = "Start with useful words near this band, then let reviews adjust the mix.";
  if (recRate - prodRate >= 0.2) {
    note = "Your sampled meaning recognition was stronger than your word recall. Start with practical word-use exercises and adjust from your reviews.";
  } else if (prodRate - recRate >= 0.2) {
    note = "Your sampled word use was stronger than meaning recognition. Keep checking precise meanings, not only rarer words.";
  }
  if (coverage === "provisional") {
    note = `${note} Coverage is limited, so this is a starting hint, not a precise vocabulary size.`;
  }
  if (recognition.every((item) => item.outcome === "correct") && production.every((item) => item.outcome === "correct") && production.length) {
    note = "You reached the top of this short sample. That is a ceiling on this check, not an official English certificate.";
  }
  return {
    recommendedBand,
    recognitionBand,
    productionBand,
    coverage,
    recognitionCorrect: recognition.filter((item) => item.outcome === "correct").length,
    recognitionTotal: recognition.length,
    productionCorrect: production.filter((item) => item.outcome === "correct").length,
    productionTotal: production.length,
    sampledByBand,
    note,
  };
}

export async function loadActiveAssessment(): Promise<AssessmentSessionRecord | null> {
  const rows = await db.assessmentSessions.toArray();
  return rows
    .filter((row) => !row.completedAt)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0] ?? null;
}

export async function startAssessment(now = new Date()): Promise<AssessmentSessionRecord> {
  const existing = await loadActiveAssessment();
  if (existing) return existing;
  const profile = await ensureProfile();
  const queue = buildAssessmentQueue(profile.estimatedBand ?? "workplace");
  const session: AssessmentSessionRecord = {
    id: crypto.randomUUID(),
    version: ASSESSMENT_BANK_VERSION,
    startedAt: now.toISOString(),
    completedAt: null,
    itemIds: queue.map((item) => item.id),
    currentIndex: 0,
    routingBand: "workplace",
    responses: [],
    result: null,
  };
  await db.assessmentSessions.put(session);
  return session;
}

export function itemForSession(session: AssessmentSessionRecord, index = session.currentIndex): AssessmentItem | null {
  const id = session.itemIds[index];
  if (!id) return null;
  return itemsById().get(id) ?? null;
}

export async function recordAssessmentAnswer(
  sessionId: string,
  response: AssessmentResponse,
  now = new Date(),
): Promise<AssessmentSessionRecord> {
  return db.transaction("rw", [db.assessmentSessions, db.profile], async () => {
    const session = await db.assessmentSessions.get(sessionId);
    if (!session || session.completedAt) throw new Error("Assessment session is not active.");
    const responses = [...session.responses, response];
    let itemIds = session.itemIds;
    let routingBand = session.routingBand;
    if (responses.length === 5) {
      routingBand = routeAfterBlock(
        session.routingBand,
        responses.slice(0, 5).map((item) => item.outcome),
      );
    }
    if (responses.length === 32) {
      const lookup = itemsById();
      const currentItems = itemIds.map((id) => lookup.get(id)).filter((item): item is AssessmentItem => Boolean(item));
      itemIds = maybeExtendQueue(currentItems, responses).map((item) => item.id);
    }
    const done = responses.length >= itemIds.length;
    const result = done ? evaluateAssessment(responses) : null;
    const next: AssessmentSessionRecord = {
      ...session,
      responses,
      itemIds,
      routingBand,
      currentIndex: Math.min(responses.length, itemIds.length),
      completedAt: done ? now.toISOString() : null,
      result,
    };
    await db.assessmentSessions.put(next);
    if (result) {
      const profile = await ensureProfile();
      await db.profile.put({
        ...profile,
        estimatedBand: result.recommendedBand,
        recognitionBand: result.recognitionBand,
        productionBand: result.productionBand,
        assessmentCoverage: result.coverage,
        assessmentVersion: ASSESSMENT_BANK_VERSION,
        diagnosticCompletedAt: now.toISOString(),
        diagnosticResponses: responses.map((item) => ({
          itemId: item.itemId,
          senseId: item.senseId ?? "",
          kind: item.skill,
          answer: item.outcome === "correct" ? "know" : item.outcome === "unknown" ? "unknown" : "familiar",
        })),
      });
    }
    return next;
  });
}

export async function abandonAssessment(sessionId: string): Promise<void> {
  const session = await db.assessmentSessions.get(sessionId);
  if (!session || session.completedAt) return;
  await db.assessmentSessions.delete(sessionId);
}

export async function latestCompletedAssessment(): Promise<AssessmentSessionRecord | null> {
  const rows = await db.assessmentSessions.toArray();
  return rows
    .filter((row) => row.completedAt && row.result)
    .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""))[0] ?? null;
}

export function unknownSenseIdsFromAssessment(session: AssessmentSessionRecord | null): Set<string> {
  const ids = new Set<string>();
  if (!session) return ids;
  for (const response of session.responses) {
    if (response.senseId && response.outcome !== "correct") ids.add(response.senseId);
  }
  return ids;
}
