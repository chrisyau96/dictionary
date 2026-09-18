import { useEffect, useRef, useState } from "react";
import { downloadJson, exportBackup, previewBackup, restoreBackup } from "../backup/io";
import { AiSetupForm } from "../components/AiSetupForm";
import { InstallHomeCard } from "../components/InstallHomeCard";
import { ScreenHeader } from "../components/ScreenHeader";
import { db, ensureProfile } from "../db/database";
import { storageSnapshot } from "../content/install";
import { go } from "../router";
import { ACCENT_OPTIONS, applyAccent, type AccentId } from "../theme/accents";
import type { DomainId, ProfileRecord } from "../types";

const DOMAIN_LABELS: Record<DomainId, string> = {
  everyday: "Everyday conversation",
  "project-management": "Project management",
  business: "Business communication",
  retail: "Retail / customer experience",
  entrepreneurship: "Entrepreneurship",
  technology: "Technology",
};

export function SettingsView() {
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [storage, setStorage] = useState("");
  const [restoreNote, setRestoreNote] = useState("");
  const [restoreName, setRestoreName] = useState("");
  const restoreInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void ensureProfile().then((next) => {
      setProfile(next);
      applyAccent(next.accentId);
    });
    void storageSnapshot().then((info) => {
      const used = info.usage !== null ? `${Math.round(info.usage / 1024)} KB used` : "usage unknown";
      const persist = info.persisted === true ? "persistent storage granted" : info.persisted === false ? "persistence not granted" : "persistence unknown";
      setStorage(`${used}; ${persist}. Browser storage can still be cleared or evicted.`);
    });
  }, []);

  async function save(next: ProfileRecord) {
    setProfile(next);
    await db.profile.put(next);
  }

  if (!profile) return <p className="muted">Loading settings…</p>;

  return (
    <section className="stack settings-page">
      <ScreenHeader title="Settings" back={{ name: "today" }} backLabel="Back to Today" />

      <section className="settings-section">
        <h2>Appearance</h2>
        <p className="settings-copy">Accent colour</p>
        <div className="accent-row">
          {ACCENT_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`accent-swatch${profile.accentId === option.id ? " active" : ""}`}
              style={{ background: option.swatch }}
              aria-label={option.name}
              title={option.name}
              onClick={() => {
                applyAccent(option.id);
                void save({ ...profile, accentId: option.id as AccentId });
              }}
            />
          ))}
        </div>
        <p className="tiny helper-copy">{ACCENT_OPTIONS.find((item) => item.id === profile.accentId)?.name} is selected.</p>
      </section>

      <section className="settings-section">
        <h2>Daily plan</h2>
        <label>
          New words each day
          <input
            type="number"
            min={0}
            max={20}
            value={profile.dailyNewLimit}
            onChange={(event) => save({ ...profile, dailyNewLimit: Number(event.target.value) })}
          />
        </label>
        <label>
          Review capacity before pausing new words
          <input
            type="number"
            min={5}
            max={80}
            value={profile.dailyReviewCapacity}
            onChange={(event) => save({ ...profile, dailyReviewCapacity: Number(event.target.value) })}
          />
        </label>
        <aside className="settings-tip">
          <p className="example-index">Tip</p>
          <p>
            These two numbers are the daily load the scheduler will try to keep. It aims for about 90% of reviewed words to stay
            rememberable, so new words pause when due reviews are already near this capacity. That is a planning target, not a
            guaranteed recall rate. Your study day follows this device’s current timezone.
          </p>
        </aside>
      </section>

      <section className="settings-section">
        <h2>Topics</h2>
        <p className="settings-copy">Used when choosing new material</p>
        <div className="stack tight">
          {(Object.keys(DOMAIN_LABELS) as DomainId[]).map((domain) => (
            <label key={domain} className="check-row">
              <input
                type="checkbox"
                checked={profile.domains.includes(domain)}
                onChange={(event) => {
                  const domains = event.target.checked
                    ? [...profile.domains, domain]
                    : profile.domains.filter((item) => item !== domain);
                  void save({ ...profile, domains });
                }}
              />
              {DOMAIN_LABELS[domain]}
            </label>
          ))}
        </div>
      </section>

      <section className="settings-section">
        <h2>AI helper</h2>
        <p className="settings-copy">
          Pick a default fast model and paste your own API key. Keys stay on this device and are never included in learning backups.
        </p>
        <AiSetupForm />
      </section>

      <section className="settings-section">
        <h2>Home screen</h2>
        <p className="settings-copy">Install this as an app on your phone’s Home Screen.</p>
        <InstallHomeCard />
      </section>

      <section className="settings-section">
        <h2>Offline pack</h2>
        <p className="settings-copy">Download or refresh the word pack, or retake the starting check.</p>
        <div className="center-actions">
          <button type="button" className="primary block" onClick={() => go({ name: "install" })}>
            Install or refresh pack
          </button>
          <button type="button" className="ghost block" onClick={() => go({ name: "diagnostic" })}>
            Retake vocabulary check
          </button>
        </div>
      </section>

      <section className="settings-section">
        <h2>Backup</h2>
        <p className="settings-copy">Keep a copy outside this phone. An internal database copy is not an independent backup. API keys are not exported.</p>
        <button
          type="button"
          className="primary block"
          onClick={async () => {
            const backup = await exportBackup();
            downloadJson(`vocab-backup-${backup.exportedAt.slice(0, 10)}.json`, backup);
          }}
        >
          Export learning records
        </button>
        <button
          type="button"
          className="ghost block file-pick"
          onClick={() => restoreInput.current?.click()}
        >
          <span className="file-pick-title">Restore from file</span>
          <span className="file-pick-copy">
            {restoreName || "Tap to choose a JSON backup. This replaces learning records on this device."}
          </span>
        </button>
        <input
          ref={restoreInput}
          className="sr-only"
          type="file"
          accept="application/json"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            setRestoreName(file.name);
            try {
              const parsed = previewBackup(JSON.parse(await file.text()));
              if (!parsed.ok) {
                setRestoreNote(parsed.error);
                return;
              }
              const preview = `${parsed.backup.userWords.length} saved senses, ${parsed.backup.reviewEvents.length} review events. Restore will replace current learning records, not the dictionary pack.`;
              if (!window.confirm(preview)) return;
              await restoreBackup(parsed.backup);
              setRestoreNote("Restore complete. Check Today and My Words.");
            } catch {
              setRestoreNote("This file could not be read as a backup.");
            }
          }}
        />
        {restoreNote ? <p className="tiny">{restoreNote}</p> : null}
      </section>

      <section className="settings-section">
        <h2>About</h2>
        <p className="settings-copy">
          Chris Workplace 1000 is original teaching text for shop, project, business, and everyday English, with wordfreq 3.1.1
          scores and Piper British English audio (Jenny).
        </p>
        <p className="tiny helper-copy">{storage}</p>
      </section>
    </section>
  );
}
