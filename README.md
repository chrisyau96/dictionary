# Chris’s Offline Vocabulary Coach

A vocabulary-learning + dictionary PWA. Study English you can use, look up installed meanings offline, and keep Hong Kong Traditional Chinese next to the English.

The first pack is **Chris Workplace 1000**: about 1,000 meanings for shop/customer work, project talk, business messages, running a small business, everyday conversation, and practical technology. It is not a 20,000-word general dictionary. Absent words stay absent.

## Why this pack

It is aimed at using English at work in Hong Kong, not collecting rare exam words. Mix (primary domain):

- Everyday conversation ~220
- Project management ~180
- Business communication ~180
- Shop / customer experience ~160
- Entrepreneurship ~130
- Practical technology ~130

Each meaning has a 0–100 commonness score (wordfreq, scale v1), part of speech beside the word, 2–3 usage examples, collocations, and synonym notes when a real difference exists.

## What works now

- Four tabs: **Today**, **Dictionary**, **My Words**, **Progress**, plus Settings.
- A short adaptive vocabulary check (recognition and production separately). It is a starting hint, not a CEFR certificate.
- Today keeps a persisted daily plan (default 5 new senses). Reopening the app does not mint a new batch. Use Already know / Not useful / Replace.
- Review is Cue → Recall → Reveal → Again/Hard/Good/Easy, with FSRS, undo, and a double-tap guard.
- Compact dictionary cards: speaker icon, English + Traditional Chinese, combinations, bilingual examples, sense-aware synonyms. IPA is hidden by default.
- **My Words** tabs: All / Learning / Known. Remove keeps the dictionary entry and the learning history.
- Progress KPI cards and charts from real review events. Saved words and retries are not counted as newly learned.
- Local FSRS scheduling via `ts-fsrs` (0.90 retention). Recognition and production are different cards.
- Backup and restore of learning records (v1 backups still restore).

## What is intentionally not here yet

- A 20,000 entry general dictionary.
- Cloud accounts, sync, or a paid API.
- Dumping all 1,000 candidate words into Today at once.
- A calibrated CEFR or vocabulary-size certificate.
- Typo-tolerant search.
- Automatic grading of free-form sentences.
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

## Test on the web

GitHub Pages URL:

https://chrisyau96.github.io/dictionary/

There is no server and no cloud database. Learning records stay in the browser on your phone.

GitHub Pages deploys from `main` after each push. Open the URL on your phone and tap **Download and verify pack**.

Local `npm run dev` is unchanged (`http://localhost:5173`). The Pages build uses the `/dictionary/` base path.

## Status

Prepared from the 5 September 2026 build plan. Architecture is in place; device airplane-mode acceptance, broader content, and provenance review of any later bulk sources remain open gates.
