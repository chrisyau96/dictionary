import { useEffect, useState } from "react";
import { ScreenHeader } from "../components/ScreenHeader";
import {
  fetchManifest,
  installPendingPacks,
  loadPackCatalog,
  loadPackSummary,
  requestPersistentStorage,
  type InstallProgress,
  type PackManifest,
} from "../content/install";
import type { PackUpdateSummary } from "../content/packs";
import { go } from "../router";

export function InstallView() {
  const [manifests, setManifests] = useState<PackManifest[]>([]);
  const [summary, setSummary] = useState<PackUpdateSummary | null>(null);
  const [progress, setProgress] = useState<InstallProgress | null>(null);
  const [error, setError] = useState("");
  const [persisted, setPersisted] = useState<boolean | null>(null);

  useEffect(() => {
    void loadPackCatalog()
      .then((catalog) => Promise.all(catalog.map((item) => fetchManifest(item.folder))))
      .then(setManifests)
      .catch((err: Error) => setError(err.message));
    loadPackSummary()
      .then(setSummary)
      .catch(() => setSummary({ offers: [], pending: [], allCurrent: false }));
  }, []);

  async function run() {
    setError("");
    setProgress(null);
    try {
      await installPendingPacks(summary?.pending ?? [], setProgress);
      setPersisted(await requestPersistentStorage());
      go({ name: "today" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Install failed.");
      setProgress(null);
    }
  }

  const teaching = manifests.find((item) => item.packId === "chris-1000") ?? manifests[0] ?? null;
  const lookup = manifests.find((item) => item.packId === "common-5000") ?? null;
  const byteSize = manifests.reduce((sum, item) => sum + item.byteSize, 0);
  const kb = byteSize ? Math.round(byteSize / 1024) : 0;
  const pending = summary?.pending ?? [];
  const needsFirstInstall = pending.some((item) => !item.installedVersion);
  const actionLabel = pending.length && !needsFirstInstall ? "Download updates" : "Download and verify packs";
  const ready = Boolean(teaching) && summary !== null;

  return (
    <section className="stack">
      <ScreenHeader
        eyebrow="Offline packs"
        title="Install packs"
        subtitle="Download once. Study without a network after that."
        back={{ name: "today" }}
        backLabel="Back to Today"
      />
      <p className="muted">
        Workplace teaching notes stay in Chris Workplace 1000. Common English 5000 adds everyday lookup words. Opening
        the page is not a finished installation.
      </p>
      {teaching ? (
        <div className="panel">
          <strong>{teaching.name}</strong>
          {lookup ? <p className="tiny">{lookup.name} installs with it</p> : null}
          <p className="muted">
            {manifests.reduce((sum, item) => sum + item.senseCount, 0)} meanings ·{" "}
            {manifests.reduce((sum, item) => sum + item.entryCount, 0)} headwords · {teaching.audioCount} audio clips ·
            about {kb} KB
          </p>
          <p className="tiny">{teaching.completeness.notes}</p>
          {lookup ? <p className="tiny">{lookup.completeness.notes}</p> : null}
          {pending.length > 1 ? (
            <p className="tiny">
              {pending.length} packs will download together: {pending.map((item) => item.name).join(", ")}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="muted">Reading pack details…</p>
      )}
      {progress ? (
        <div className="panel">
          <div className="progress-bar" aria-label="Install progress">
            <span style={{ width: `${Math.round((progress.current / Math.max(progress.total, 1)) * 100)}%` }} />
          </div>
          <p className="tiny">{progress.message}</p>
        </div>
      ) : null}
      {persisted === false ? (
        <p className="muted">Persistent storage was not granted. You can still study. Export a backup from Settings.</p>
      ) : null}
      {error ? <p className="danger">{error}</p> : null}
      <div className="center-actions">
        <button type="button" className="primary block" onClick={run} disabled={!ready || Boolean(progress)}>
          {actionLabel}
        </button>
        <button type="button" className="ghost block" onClick={() => go({ name: "today" })}>
          Back to Today
        </button>
      </div>
    </section>
  );
}
