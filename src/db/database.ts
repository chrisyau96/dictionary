import Dexie, { type Table } from "dexie";
import type {
  AudioRecord,
  CardRecord,
  ContentPackRecord,
  EntryRecord,
  FormRecord,
  LocalRequestRecord,
  MetaRecord,
  ProfileRecord,
  ReviewEventRecord,
  SenseRecord,
  UserWordRecord,
} from "../types";
import { detectTimezone } from "../time/timezone";

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
    diagnosticCompletedAt: null,
    diagnosticResponses: [],
    lastStudyDay: null,
    newIntroducedOnStudyDay: 0,
  };
}

export async function ensureProfile(): Promise<ProfileRecord> {
  const existing = await db.profile.get("profile");
  if (existing) return existing;
  const created = defaultProfile();
  await db.profile.put(created);
  return created;
}
