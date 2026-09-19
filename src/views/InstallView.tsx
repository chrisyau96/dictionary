import { useEffect, useState } from "react";
import { ScreenHeader } from "../components/ScreenHeader";
import {
  fetchManifest,
  installPendingPacks,
  loadPackSummary,
  requestPersistentStorage,
  type InstallProgress,
  type PackManifest,
} from "../content/install";
import type { PackUpdateSummary } from "../content/packs";
import { go } from "../router";

export function InstallView() {
  const [manifest, setManifest] = useState<PackManifest | null>(null);
  const [summary, setSummary] = useState<PackUpdateSummary | null>(null);
  const [progress, setProgress] = useState<InstallProgress | null>(null);
  const [error, setError] = useState("");
  const [persisted, setPersisted] = useState<boolean | null>(null);

  useEffect(() => {
    fetchManifest()
      .then(setManifest)
      .catch((err: Error) => setError(err.message));
    loadPackSummary()
      .then(setSummary)
      .catch(() => setSummary(null));
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

  const kb = manifest ? Math.round(manifest.byteSize / 1024) : 0;
  const pending = summary?.pending ?? [];
  const needsFirstInstall = pending.some((item) => !item.installedVersion);
  const actionLabel = pending.length && !needsFirstInstall ? "Download updates" : "Download and verify pack";

  return (
    <section className="stack">
      <ScreenHeader
        eyebrow="Offline pack"
        title="Install pack"
        subtitle="Download once. Study without a network after that."
        back={{ name: "today" }}
        backLabel="Back to Today"
      />
      <p className="muted">
        This is a vocabulary + dictionary pack for your work in Hong Kong: shop talk, project work, business messages, and everyday English. Opening the page is not a finished installation.
      </p>
      {manifest ? (
        <div className="panel">
          <strong>{manifest.name}</strong>
          <p className="muted">
            {manifest.senseCount} meanings · {manifest.entryCount} headwords · {manifest.audioCount} audio clips · about {kb} KB
          </p>
          <p className="tiny">{manifest.completeness.notes}</p>
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
        <button type="button" className="primary block" onClick={run} disabled={!manifest || Boolean(progress)}>
          {actionLabel}
        </button>
        <button type="button" className="ghost block" onClick={() => go({ name: "today" })}>
          Back to Today
        </button>
      </div>
    </section>
  );
}
