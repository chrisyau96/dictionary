import { useEffect, useState } from "react";
import { downloadJson, exportBackup, previewBackup, restoreBackup } from "../backup/io";
import { db, ensureProfile } from "../db/database";
import { storageSnapshot } from "../content/install";
import { go } from "../router";
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
  const [storage, setStorage] = useState<string>("");
  const [restoreNote, setRestoreNote] = useState("");

  useEffect(() => {
    void ensureProfile().then(setProfile);
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
    <section className="stack">
      <header className="topbar">
        <h1>Settings</h1>
      </header>
      <div className="panel stack">
        <label>
          New senses each day
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
        <label>
          Study timezone
          <input value={profile.timezone} onChange={(event) => save({ ...profile, timezone: event.target.value })} />
        </label>
        <p className="tiny">Desired retention target is 0.90. This is a scheduler target, not a guaranteed recall rate.</p>
      </div>
      <div className="panel">
        <p>Domains used when choosing new material</p>
        <div className="stack">
          {(Object.keys(DOMAIN_LABELS) as DomainId[]).map((domain) => (
            <label key={domain}>
              <input
                type="checkbox"
                checked={profile.domains.includes(domain)}
                onChange={(event) => {
                  const domains = event.target.checked
                    ? [...profile.domains, domain]
                    : profile.domains.filter((item) => item !== domain);
                  void save({ ...profile, domains });
                }}
              />{" "}
              {DOMAIN_LABELS[domain]}
            </label>
          ))}
        </div>
      </div>
      <div className="panel stack">
        <button type="button" className="primary" onClick={() => go({ name: "install" })}>Content installation</button>
        <button type="button" className="ghost" onClick={() => go({ name: "diagnostic" })}>Repeat start check</button>
        <p className="tiny">{storage}</p>
      </div>
      <div className="panel stack">
        <p>Backup is part of the foundation. An internal database copy is not an independent backup.</p>
        <button
          type="button"
          className="primary"
          onClick={async () => {
            const backup = await exportBackup();
            downloadJson(`vocab-backup-${backup.exportedAt.slice(0, 10)}.json`, backup);
          }}
        >
          Export learning records
        </button>
        <label>
          Restore from file
          <input
            type="file"
            accept="application/json"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              const parsed = previewBackup(JSON.parse(await file.text()));
              if (!parsed.ok) {
                setRestoreNote(parsed.error);
                return;
              }
              const preview = `${parsed.backup.userWords.length} saved senses, ${parsed.backup.reviewEvents.length} review events. Restore will replace current learning records, not the dictionary pack.`;
              if (!window.confirm(preview)) return;
              await restoreBackup(parsed.backup);
              setRestoreNote("Restore complete. Check Today and My Words.");
            }}
          />
        </label>
        {restoreNote ? <p className="tiny">{restoreNote}</p> : null}
      </div>
      <div className="panel tiny">
        <p>Foundation 50 uses original teaching text, wordfreq 3.1.1 frequencies, and eSpeak NG British English audio. Licenses stay inside the installed pack.</p>
        <p>No account, no cloud sync, no paid dictionary API. Hosting a static build can use a free HTTPS host later.</p>
      </div>
    </section>
  );
}
