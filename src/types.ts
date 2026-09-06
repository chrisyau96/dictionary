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
export type UsefulnessFeedback = "already-know" | "not-useful" | "too-easy" | "replace" | null;
export type MembershipState = "active" | "removed";
export type KnownEvidence = "self-declared" | "review-verified" | null;
export type RecommendPreference = "include" | "exclude";
export type SynonymStatus = "available" | "none_appropriate" | "not_prepared";
export type DiagnosticAnswer = "know" | "familiar" | "unknown";
export type AssessmentOutcome = "correct" | "incorrect" | "unknown";
export type EditorialBand = "everyday" | "workplace" | "professional" | "specialist";
/** @deprecated Use EditorialBand. Kept as an alias for older comments. */
export type EstimatedBand = EditorialBand;
export type PackInstallStatus = "absent" | "staging" | "installed" | "failed";
export type DailyItemStatus = "not-started" | "started" | "practised" | "replaced" | "already-know" | "not-useful";
export type ReviewSessionType = "scheduled" | "learn-new";
export type AssessmentCoverage = "adequate" | "provisional";
export type DifficultyPreference = "none" | "easier" | "harder";

export type AccentId = "purple" | "indigo" | "blue" | "teal" | "green" | "orange" | "rose";

export const REVIEW_VERIFIED_RULE_VERSION = "rv-1";
export const ASSESSMENT_BANK_VERSION = "v2";
export const ASSESSMENT_LENGTH = 20;
export const BACKUP_VERSION = 2;

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
  synonymStatus: SynonymStatus;
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
  membership: MembershipState;
  removedAt: string | null;
  knownEvidence: KnownEvidence;
  recommend: RecommendPreference;
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
  studyDay: string;
  rating: 1 | 2 | 3 | 4;
  prior: SchedulerSnapshot;
  next: SchedulerSnapshot;
  undone: boolean;
  sessionType: ReviewSessionType;
  hinted: boolean;
}

export interface DiagnosticResponse {
  itemId: string;
  senseId: string;
  kind: "recognition" | "production";
  answer: DiagnosticAnswer;
}

export interface AssessmentResponse {
  itemId: string;
  itemVersion: string;
  senseId: string | null;
  band: EditorialBand;
  skill: CardTask;
  outcome: AssessmentOutcome;
  answer: string;
  optionOrder?: string[];
  ratedAt: string;
}

export interface AssessmentResult {
  recommendedBand: EditorialBand;
  recognitionBand: EditorialBand;
  productionBand: EditorialBand;
  coverage: AssessmentCoverage;
  recognitionCorrect: number;
  recognitionTotal: number;
  productionCorrect: number;
  productionTotal: number;
  sampledByBand: Record<EditorialBand, { correct: number; total: number }>;
  note: string;
  overallCorrect: number;
  overallTotal: number;
}

export interface AssessmentSessionRecord {
  id: string;
  version: string;
  startedAt: string;
  completedAt: string | null;
  itemIds: string[];
  currentIndex: number;
  routingBand: EditorialBand;
  responses: AssessmentResponse[];
  result: AssessmentResult | null;
}

export interface DailyPlanItem {
  senseId: string;
  entryId: string;
  reason: string;
  source: "saved" | "gap" | "replacement";
  status: DailyItemStatus;
}

export interface DailySessionState {
  cardIds: string[];
  index: number;
  sessionType: ReviewSessionType;
  startedAt: string;
  completedAt: string | null;
}

export interface DailyPlanRecord {
  id: string;
  dayKey: string;
  createdAt: string;
  timezone: string;
  newLimit: number;
  pauseNew: boolean;
  items: DailyPlanItem[];
  session: DailySessionState | null;
}

export interface ProfileRecord {
  id: "profile";
  createdAt: string;
  timezone: string;
  dailyNewLimit: number;
  dailyReviewCapacity: number;
  desiredRetention: number;
  domains: DomainId[];
  estimatedBand: EditorialBand | null;
  recognitionBand: EditorialBand | null;
  productionBand: EditorialBand | null;
  assessmentCoverage: AssessmentCoverage | null;
  assessmentVersion: string | null;
  diagnosticCompletedAt: string | null;
  diagnosticResponses: DiagnosticResponse[];
  lastStudyDay: string | null;
  newIntroducedOnStudyDay: number;
  difficultyPreference: DifficultyPreference;
  seenReviewHelp: boolean;
  showPhonetics: boolean;
  accentId: AccentId;
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
  version: 1 | 2;
  exportedAt: string;
  appVersion: string;
  contentRefs: { packId: string; version: string }[];
  userWords: UserWordRecord[];
  cards: CardRecord[];
  reviewEvents: ReviewEventRecord[];
  profile: ProfileRecord;
  localRequests: LocalRequestRecord[];
  dailyPlans?: DailyPlanRecord[];
  assessmentSessions?: AssessmentSessionRecord[];
}
