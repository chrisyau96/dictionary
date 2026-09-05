export type PartOfSpeech =
  | "noun"
  | "verb"
  | "adjective"
  | "adverb"
  | "pronoun"
  | "phrase";

export type DomainId =
  | "everyday"
  | "project-management"
  | "business"
  | "retail"
  | "entrepreneurship"
  | "technology";

export type FrequencyStatus = "measured" | "unmeasured";
export type SelectionPolicy = "learn" | "calibration";
export type CardTask = "recognition" | "production";
export type UserWordStatus = "learning" | "known" | "paused";
export type UsefulnessFeedback = "already-know" | "not-useful" | "too-easy" | null;
export type DiagnosticAnswer = "know" | "familiar" | "unknown";
export type EstimatedBand = "emerging" | "developing" | "independent";
export type PackInstallStatus = "absent" | "staging" | "installed" | "failed";

export interface FrequencyRecord {
  form: string;
  zipf: number | null;
  commonness: number | null;
  source: string;
  sourceVersion: string;
  scaleVersion: string;
  status: FrequencyStatus;
}

export interface Example {
  id: string;
  en: string;
  tc: string;
  context: string;
}

export interface SynonymNote {
  term: string;
  relation: string;
  difference: string;
}

export interface SenseRecord {
  id: string;
  entryId: string;
  packId: string;
  pos: string;
  ipa: string;
  pronunciationId: string;
  glossEn: string;
  glossTc: string;
  usageNote: string | null;
  domains: DomainId[];
  examples: Example[];
  synonyms: SynonymNote[];
  synonymStatus: "authored" | "none-appropriate";
  collocations: string[];
  frequency: FrequencyRecord;
  selection: SelectionPolicy;
}

export interface EntryRecord {
  id: string;
  packId: string;
  lemma: string;
  display: string;
  pos: string[];
  searchableForms: string[];
  domains: DomainId[];
  selection?: SelectionPolicy;
  kind?: string;
}

export interface FormRecord {
  id: string;
  packId: string;
  form: string;
  normalized: string;
  entryId: string;
  kind: "lemma" | "inflection";
}

export interface AudioRecord {
  id: string;
  packId: string;
  accent: string;
  mediaKey: string;
  hash: string;
  bytes: number;
  mime: string;
}

export interface ContentPackRecord {
  packId: string;
  version: string;
  schemaVersion: number;
  name: string;
  accent: string;
  entryCount: number;
  senseCount: number;
  audioCount: number;
  status: PackInstallStatus;
  installedAt: string | null;
  checksums: Record<string, string>;
  completeness: {
    meanings: string;
    audio: string;
    examples: string;
    synonyms: string;
    frequency: string;
    notes: string;
  };
}

export interface UserWordRecord {
  id: string;
  senseId: string;
  entryId: string;
  savedAt: string;
  status: UserWordStatus;
  notes: string;
  usefulness: UsefulnessFeedback;
  reason: string;
}

export interface SchedulerSnapshot {
  due: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  learning_steps: number;
  reps: number;
  lapses: number;
  state: number;
  last_review?: string;
}

export interface CardRecord {
  id: string;
  senseId: string;
  entryId: string;
  task: CardTask;
  introducedAt: string;
  scheduler: SchedulerSnapshot;
  schedulerVersion: string;
  desiredRetention: number;
  paused: boolean;
}

export interface ReviewEventRecord {
  id: string;
  cardId: string;
  senseId: string;
  task: CardTask;
  ratedAt: string;
  rating: 1 | 2 | 3 | 4;
  prior: SchedulerSnapshot;
  next: SchedulerSnapshot;
  undone: boolean;
}

export interface DiagnosticResponse {
  itemId: string;
  senseId: string;
  kind: "recognition" | "production";
  answer: DiagnosticAnswer;
}

export interface ProfileRecord {
  id: "profile";
  createdAt: string;
  timezone: string;
  dailyNewLimit: number;
  dailyReviewCapacity: number;
  desiredRetention: number;
  domains: DomainId[];
  estimatedBand: EstimatedBand | null;
  diagnosticCompletedAt: string | null;
  diagnosticResponses: DiagnosticResponse[];
  lastStudyDay: string | null;
  newIntroducedOnStudyDay: number;
}

export interface LocalRequestRecord {
  id: string;
  term: string;
  note: string;
  createdAt: string;
}

export interface MetaRecord {
  key: string;
  value: unknown;
}

export interface BackupFile {
  kind: "vocab-coach-backup";
  version: 1;
  exportedAt: string;
  appVersion: string;
  contentRefs: { packId: string; version: string }[];
  userWords: UserWordRecord[];
  cards: CardRecord[];
  reviewEvents: ReviewEventRecord[];
  profile: ProfileRecord;
  localRequests: LocalRequestRecord[];
}
