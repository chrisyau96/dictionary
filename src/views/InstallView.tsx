import { useEffect, useState } from "react";
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
    try {
      setPersisted(await requestPersistentStorage());
      await installFoundationPack(setProgress);
      go({ name: "diagnostic" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Install failed.");
    }
  }

  const kb = manifest ? Math.round(manifest.byteSize / 1024) : 0;

  return (
    <section className="stack">
      <header className="topbar">
        <h1>Prepare offline use</h1>
      </header>
      <p className="muted">
        Opening the page is not a finished installation. Download the foundation pack, verify it, and store it on this device.
      </p>
      {manifest ? (
        <div className="panel">
          <strong>{manifest.name}</strong>
          <p className="muted">
            {manifest.senseCount} senses · {manifest.entryCount} headwords · {manifest.audioCount} audio clips · about {kb} KB
          </p>
          <p className="tiny">{manifest.completeness.notes}</p>
        </div>
      ) : (
        <p className="muted">Reading pack details…</p>
      )}
      {progress ? (
        <div className="panel">
          <div className="progress-bar" aria-label="Install progress">
            <span style={{ width: `${Math.round((progress.current / progress.total) * 100)}%` }} />
          </div>
          <p className="tiny">{progress.message}</p>
        </div>
      ) : null}
      {persisted === false ? (
        <p className="muted">Persistent storage was not granted. Learning records can still be used, but the browser may evict data if space is low. Export a backup from Settings.</p>
      ) : null}
      {error ? <p className="danger">{error}</p> : null}
      <button type="button" className="primary block" onClick={run} disabled={!manifest || Boolean(progress && progress.phase !== "ready")}>
        Download and verify pack
      </button>
    </section>
  );
}
