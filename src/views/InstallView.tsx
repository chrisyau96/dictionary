import { useEffect, useState } from "react";
import { ScreenHeader } from "../components/ScreenHeader";
import { fetchManifest, installFoundationPack, requestPersistentStorage, type InstallProgress, type PackManifest } from "../content/install";
import { go } from "../router";

export function InstallView() {
  const [manifest, setManifest] = useState<PackManifest | null>(null);
  const [progress, setProgress] = useState<InstallProgress | null>(null);
  const [error, setError] = useState("");
  const [persisted, setPersisted] = useState<boolean | null>(null);

  useEffect(() => {
    fetchManifest()
      .then(setManifest)
      .catch((err: Error) => setError(err.message));
  }, []);

  async function run() {
    setError("");
    setProgress(null);
    try {
      await installFoundationPack(setProgress);
      setPersisted(await requestPersistentStorage());
      go({ name: "diagnostic" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Install failed.");
      setProgress(null);
    }
  }

  const kb = manifest ? Math.round(manifest.byteSize / 1024) : 0;

  return (
    <section className="stack">
      <ScreenHeader title="Install pack" back={{ name: "today" }} />
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
          Download and verify pack
        </button>
        <button type="button" className="ghost block" onClick={() => go({ name: "today" })}>Back to Today</button>
      </div>
    </section>
  );
}
