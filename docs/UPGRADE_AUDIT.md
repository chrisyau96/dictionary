# Upgrade audit — Chris Workplace vocabulary coach

Inspected 5 September 2026 against the 6 September upgrade pack. This is a verified local audit of `/workspace`, not a rebuild plan.

## Current architecture

- React 19 + TypeScript + Vite 7 PWA (`vite-plugin-pwa`), hash routes in `src/router.ts`.
- Primary tabs: Today · Dictionary · My Words · Progress. Settings / install / diagnostic / review are secondary screens.
- Local store: Dexie IndexedDB `vocab-coach` **version 1**.
- Scheduler: `ts-fsrs` with `FSRSVersion` stored per card; desired retention 0.90.
- Content: `public/packs/chris-1000/` (~1000 senses, British English MP3s). Launch requires this pack.
- Offline: app shell precached; pack JSON/MP3 verified then stored in IndexedDB. No paid APIs, no cloud DB, no live AI.

Key files: `src/App.tsx`, `src/views/*`, `src/db/database.ts`, `src/study/session.ts`, `src/study/diagnostic.ts`, `src/recommend/select.ts`, `src/scheduler/schedule.ts`, `src/content/install.ts`, `src/backup/io.ts`.

## Current storage model

Tables: packs, entries, senses, forms, audio, audioBlobs, userWords, cards, reviewEvents, profile, localRequests, meta.

- One `UserWordRecord` per saved sense (`status`: learning | known | paused).
- Two cards per sense when production unlocks: `card:recognition:` and `card:production:`.
- Backup JSON **v1** exports userWords, cards, reviewEvents, profile, localRequests. Dictionary pack is not in the backup.

No daily-plan table. No assessment-session table. Membership, knowledge evidence, and recommendation preference are collapsed into `status` + `usefulness`.

## Current review logic

Verified working: Cue → Reveal → Again/Hard/Good/Easy → FSRS `next()`. Undo restores `prior` and voids the event. 600ms double-tap guard. Recognition and production are separate cards. Production is unlocked after a successful recognition with `reps >= 2`.

Gaps vs spec: Today re-picks new senses on every load; no persisted daily batch; no Already know / Not useful / Replace; marking Known pauses cards; review session is not frozen; Progress counts raw events.

## Why Today is too easy

1. `scoreCandidate` adds `commonness / 20`, so frequent words rank higher.
2. If the diagnostic is skipped, `estimatedBand` is null and the band filter does not apply.
3. The 12-item diagnostic starts with *help / please / customer*.
4. Pack includes calibration pronouns (I/you/we/they) plus other ultra-common function words.
5. Band ranges for `emerging` prefer commonness 55–100.

## Why synonyms look missing

Not a render bug. Builder sets `synonymStatus: "authored" if synonyms else "none-appropriate"`. About 922/1000 senses have empty `synonyms` and are labelled `none-appropriate`. The UI then says “No interchangeable synonym”. Schema cannot say `not_prepared`. Trace: lexicon default `[]` → pack builder → IDB → EntryView.

## Pronunciation

`AudioButton` is a wordy “Listen” control. Pack MP3 in IndexedDB, `speechSynthesis` fallback. IPA is shown on the entry (`sense.ipa`). Spec: compact speaker icon, no phonetic spelling by default.

## Recommended modifications (in-place)

1. Dexie **v2**: `dailyPlans`, `assessmentSessions`; extend userWords / reviewEvents / profile; remap synonym status; do not wipe learner data.
2. Replace the 12-item diagnostic with a 32-item adaptive check (recognition vs production separate; four editorial bands; no CEFR claim).
3. Persist a finite daily plan; stop ranking by raw commonness; exclude closed-class from auto-new.
4. Compact Today / review / entry / My Words / Progress as specified.
5. Honest Progress KPIs from review events; SVG charts; no demo numbers.
6. Normalize synonym status at install and in v2 upgrade. Do not fabricate synonyms.
7. Keep FSRS, backup/export, and offline pack install.

## Files likely to change

`src/types.ts`, `src/db/database.ts`, `src/backup/io.ts`, `src/study/*`, `src/recommend/select.ts`, `src/views/*`, `src/components/AudioButton.tsx`, `src/styles.css`, `scripts/build_chris_pack.py`, tests under `src/**/*.test.ts`. New: `src/study/plan.ts`, `src/study/assessment.ts`, `src/progress/metrics.ts`, `src/content/synonyms.ts`.

## Migration risks

- Do **not** delete IndexedDB. v2 upgrade must fill defaults.
- Old backups are v1: restore must still work, then normalize records.
- Existing Known words paused their cards; leave those paused. New “Mark known” must not pause maintenance reviews or invent FSRS success.
- Reinstalling the pack replaces dictionary rows only; cards/userWords stay. Sense IDs must remain stable.
- Empty `none-appropriate` synonyms become `not_prepared` except closed-class (`none_appropriate`).
- Candidate JSON/MD is an editorial pool, not a dump into Today.

No genuine blocker. Implementation proceeds on this foundation.
