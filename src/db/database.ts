import Dexie, { type Table } from "dexie";
import { normalizeSenseSynonyms } from "../content/synonyms";
import { detectTimezone, studyDayKey } from "../time/timezone";
import type {
  AssessmentSessionRecord,
  AudioRecord,
  CardRecord,
  ContentPackRecord,
  DailyPlanRecord,
  EditorialBand,
  EntryRecord,
  FormRecord,
  LocalRequestRecord,
  MetaRecord,
  ProfileRecord,
  ReviewEventRecord,
  SenseRecord,
  UserWordRecord,
} from "../types";

function mapLegacyBand(value: string | null | undefined): EditorialBand | null {
  if (!value) return null;
  if (value === "emerging") return "everyday";
  if (value === "developing") return "workplace";
  if (value === "independent") return "professional";
  if (value === "everyday" || value === "workplace" || value === "professional" || value === "specialist") {
    return value;
  }
  return null;
}

export function normalizeUserWord(raw: Partial<UserWordRecord> & Pick<UserWordRecord, "id" | "senseId" | "entryId">): UserWordRecord {
  const status = raw.status ?? "learning";
  const usefulness = raw.usefulness ?? null;
  const excluded =
    raw.recommend === "exclude" ||
    usefulness === "not-useful" ||
    usefulness === "already-know" ||
    usefulness === "too-easy";
  return {
    id: raw.id,
    senseId: raw.senseId,
    entryId: raw.entryId,
    savedAt: raw.savedAt ?? new Date().toISOString(),
    status,
    notes: raw.notes ?? "",
    usefulness,
    reason: raw.reason ?? "",
    membership: raw.membership ?? "active",
    removedAt: raw.removedAt ?? null,
    knownEvidence: raw.knownEvidence ?? (status === "known" ? "self-declared" : null),
    recommend: raw.recommend ?? (excluded ? "exclude" : "include"),
  };
}

export function normalizeReviewEvent(
  raw: Partial<ReviewEventRecord> & Pick<ReviewEventRecord, "id" | "cardId" | "senseId" | "task" | "ratedAt" | "rating" | "prior" | "next" | "undone">,
  timezone = "Asia/Hong_Kong",
): ReviewEventRecord {
  return {
    ...raw,
    studyDay: raw.studyDay ?? studyDayKey(new Date(raw.ratedAt), timezone),
    sessionType: raw.sessionType ?? "scheduled",
    hinted: raw.hinted ?? false,
  };
}

export function normalizeProfile(raw: Partial<ProfileRecord> | undefined, now = new Date()): ProfileRecord {
  const base = defaultProfile(now);
  if (!raw) return base;
  const estimatedBand = mapLegacyBand(raw.estimatedBand ?? null);
  return {
    ...base,
    ...raw,
    id: "profile",
    estimatedBand,
    recognitionBand: mapLegacyBand(raw.recognitionBand) ?? estimatedBand,
    productionBand: mapLegacyBand(raw.productionBand) ?? estimatedBand,
    assessmentCoverage: raw.assessmentCoverage ?? (raw.diagnosticCompletedAt ? "provisional" : null),
    assessmentVersion: raw.assessmentVersion ?? (raw.diagnosticCompletedAt ? "legacy-12" : null),
    difficultyPreference: raw.difficultyPreference ?? "none",
    seenReviewHelp: raw.seenReviewHelp ?? false,
    showPhonetics: raw.showPhonetics ?? false,
    diagnosticResponses: raw.diagnosticResponses ?? [],
  };
}

export class VocabDatabase extends Dexie {
  packs!: Table<ContentPackRecord, string>;
  entries!: Table<EntryRecord, string>;
  senses!: Table<SenseRecord, string>;
  forms!: Table<FormRecord, string>;
  audio!: Table<AudioRecord, string>;
  audioBlobs!: Table<{ id: string; blob: Blob; hash: string }, string>;
  userWords!: Table<UserWordRecord, string>;
  cards!: Table<CardRecord, string>;
  reviewEvents!: Table<ReviewEventRecord, string>;
  profile!: Table<ProfileRecord, string>;
  localRequests!: Table<LocalRequestRecord, string>;
  meta!: Table<MetaRecord, string>;
  dailyPlans!: Table<DailyPlanRecord, string>;
  assessmentSessions!: Table<AssessmentSessionRecord, string>;

  constructor() {
    super("vocab-coach");
    this.version(1).stores({
      packs: "packId, status",
      entries: "id, packId, lemma",
      senses: "id, packId, entryId",
      forms: "id, packId, normalized, entryId",
      audio: "id, packId",
      audioBlobs: "id",
      userWords: "id, senseId, entryId, status, savedAt",
      cards: "id, senseId, entryId, task, paused",
      reviewEvents: "id, cardId, senseId, ratedAt, undone",
      profile: "id",
      localRequests: "id, createdAt, term",
      meta: "key",
    });
    this.version(2)
      .stores({
        packs: "packId, status",
        entries: "id, packId, lemma",
        senses: "id, packId, entryId",
        forms: "id, packId, normalized, entryId",
        audio: "id, packId",
        audioBlobs: "id",
        userWords: "id, senseId, entryId, status, savedAt, membership",
        cards: "id, senseId, entryId, task, paused",
        reviewEvents: "id, cardId, senseId, ratedAt, undone, studyDay",
        profile: "id",
        localRequests: "id, createdAt, term",
        meta: "key",
        dailyPlans: "id, dayKey",
        assessmentSessions: "id, completedAt",
      })
      .upgrade(async (tx) => {
        await tx
          .table("senses")
          .toCollection()
          .modify((sense) => {
            const next = normalizeSenseSynonyms(sense as SenseRecord);
            (sense as SenseRecord).synonymStatus = next.synonymStatus;
          });
        await tx
          .table("userWords")
          .toCollection()
          .modify((word) => {
            const next = normalizeUserWord(word as UserWordRecord);
            Object.assign(word, next);
          });
        const profileRow = await tx.table("profile").get("profile");
        const timezone = (profileRow as ProfileRecord | undefined)?.timezone ?? "Asia/Hong_Kong";
        await tx
          .table("reviewEvents")
          .toCollection()
          .modify((event) => {
            Object.assign(event, normalizeReviewEvent(event as ReviewEventRecord, timezone));
          });
        if (profileRow) {
          await tx.table("profile").put(normalizeProfile(profileRow as ProfileRecord));
        }
      });
  }
}

export const db = new VocabDatabase();

export function defaultProfile(now = new Date()): ProfileRecord {
  return {
    id: "profile",
    createdAt: now.toISOString(),
    timezone: detectTimezone(),
    dailyNewLimit: 5,
    dailyReviewCapacity: 20,
    desiredRetention: 0.9,
    domains: [
      "everyday",
      "project-management",
      "business",
      "retail",
      "entrepreneurship",
      "technology",
    ],
    estimatedBand: null,
    recognitionBand: null,
    productionBand: null,
    assessmentCoverage: null,
    assessmentVersion: null,
    diagnosticCompletedAt: null,
    diagnosticResponses: [],
    lastStudyDay: null,
    newIntroducedOnStudyDay: 0,
    difficultyPreference: "none",
    seenReviewHelp: false,
    showPhonetics: false,
  };
}

export async function ensureProfile(): Promise<ProfileRecord> {
  const existing = await db.profile.get("profile");
  if (!existing) {
    const created = defaultProfile();
    await db.profile.put(created);
    return created;
  }
  const needsWrite =
    existing.difficultyPreference == null ||
    existing.seenReviewHelp == null ||
    existing.showPhonetics == null ||
    existing.estimatedBand === ("emerging" as ProfileRecord["estimatedBand"]) ||
    existing.estimatedBand === ("developing" as ProfileRecord["estimatedBand"]) ||
    existing.estimatedBand === ("independent" as ProfileRecord["estimatedBand"]);
  const normalized = normalizeProfile(existing);
  if (needsWrite) await db.profile.put(normalized);
  return normalized;
}
