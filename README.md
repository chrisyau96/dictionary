# Chris’s Offline Vocabulary Coach

Mobile-first, offline-first progressive web app for learning English vocabulary with Hong Kong Traditional Chinese explanations. This repository is the first engineering slice: a real install → search → save → review → audio → backup path on a 50-sense foundation pack.

This is not a finished general dictionary. Absent words stay absent. The app does not call a dictionary API or invent definitions.

## What works now (Gate 1)

- Four tabs: **Today**, **Dictionary**, **My Words**, **Progress**, plus Settings.
- Visible **Prepare offline use** flow with counts, checksums, and IndexedDB import.
- Dictionary search: exact forms, headwords/inflections, then prefixes. Ambiguous forms such as `saw` stay separate.
- Sense pages with English + Traditional Chinese, IPA, packaged British English audio, commonness badge, examples, and synonym notes.
- Local FSRS scheduling via pinned `ts-fsrs` (desired retention 0.90). Recognition and production are different cards.
- Backup and restore of learning records. Content packs stay separate from user progress.
- Short start check. Result is an estimate, not a CEFR score.

## What is intentionally not here yet

- A 500–20,000 entry dictionary.
- Cloud accounts, sync, or a paid API.
- Typo-tolerant search.
- Automatic grading of typed answers.
- A second audio accent.

## Run locally

Run these commands **inside the cloned project folder** (the folder that contains `package.json`), not from `C:\Users\User`.

```bash
git clone https://github.com/chrisyau96/dictionary.git
cd dictionary
git checkout cursor/offline-vocabulary-coach-1506
git pull
npm install
npm run dev
```

Then open the URL printed in the terminal, usually `http://localhost:5173`, and tap **Download and verify pack**. A “persistent storage was not granted” note on localhost is a warning, not a failed install.

```bash
npm test
```

Production build and HTTPS-style preview:

```bash
npm run build
npm run preview
```

Install the preview over HTTPS or `localhost`, then use **Prepare offline use**. Airplane-mode proof still needs a real phone.

Rebuild the foundation pack (requires `wordfreq`, `espeak-ng`, and `ffmpeg`):

```bash
python3 scripts/make_icons.py
python3 scripts/build_foundation_pack.py
```

## Commonness

Single-word Zipf values come from `wordfreq` 3.1.1 at pack build time.

```text
commonness = round(100 × clamp((zipf - 2.0) / 4.5, 0, 1))
```

This is the app’s display convention (scale `v1`), not a language standard. `I`, `you`, `we`, and `they` all sit at 100, as the top-band rule intends. Phrases such as `cash flow` are **Not measured**.

## Licenses and notices

- App code: MIT.
- Teaching glosses, examples, and synonym notes: original material in this repo.
- Frequency values: [wordfreq](https://github.com/rspeer/wordfreq) 3.1.1. Keep the pack notices if you redistribute those values.
- Audio: generated with eSpeak NG `en-gb`, 32 kbit/s MP3. IPA is always kept.

See `public/packs/foundation-50/NOTICES.md`.

## Hosting

The built `dist/` folder is a static site. Cloudflare Pages is a suitable free HTTPS host. There is no server process and no database to provision.

## Status

Prepared from the 5 September 2026 build plan. Architecture is in place; device airplane-mode acceptance, broader content, and provenance review of any later bulk sources remain open gates.
