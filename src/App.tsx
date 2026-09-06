import { useEffect, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { db, ensureProfile } from "./db/database";
import { parseHash, type Route, go } from "./router";
import { applyAccent, DEFAULT_ACCENT } from "./theme/accents";
import { DiagnosticView } from "./views/DiagnosticView";
import { DictionaryView } from "./views/DictionaryView";
import { EntryView } from "./views/EntryView";
import { InstallView } from "./views/InstallView";
import { MyWordsView } from "./views/MyWordsView";
import { ProgressView } from "./views/ProgressView";
import { ReviewView } from "./views/ReviewView";
import { SettingsView } from "./views/SettingsView";
import { TodayView } from "./views/TodayView";

function currentTab(route: Route): "today" | "dictionary" | "words" | "progress" {
  if (route.name === "words") return "words";
  if (route.name === "progress") return "progress";
  if (route.name === "dictionary" || route.name === "entry") return "dictionary";
  return "today";
}

export function App() {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));
  const [ready, setReady] = useState(false);
  const [installed, setInstalled] = useState(false);
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({ immediate: true });

  useEffect(() => {
    const onHash = () => setRoute(parseHash(window.location.hash));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    void ensureProfile().then((profile) => applyAccent(profile.accentId || DEFAULT_ACCENT));
  }, []);

  useEffect(() => {
    void db.packs.get("chris-1000").then((pack) => {
      const ok = pack?.status === "installed";
      setInstalled(ok);
      setReady(true);
      if (!ok && route.name !== "install") go({ name: "install" });
    });
  }, [route.name]);

  if (!ready) return <p className="muted">Opening local records…</p>;

  const tab = currentTab(route);
  const hideTabs = route.name === "review" || route.name === "install" || route.name === "diagnostic" || route.name === "entry" || route.name === "settings";

  return (
    <div className="app">
      {needRefresh ? (
        <div className="update-banner">
          <span>A new app version is ready. Your learning records stay on this device.</span>
          <button type="button" className="ghost" onClick={() => updateServiceWorker(true)}>Update</button>
        </div>
      ) : null}
      {route.name === "today" && <TodayView />}
      {route.name === "dictionary" && <DictionaryView initialQuery={route.q} />}
      {route.name === "entry" && <EntryView entryId={route.entryId} senseId={route.senseId} />}
      {route.name === "words" && <MyWordsView />}
      {route.name === "progress" && <ProgressView />}
      {route.name === "settings" && <SettingsView />}
      {route.name === "review" && <ReviewView />}
      {route.name === "install" && <InstallView />}
      {route.name === "diagnostic" && <DiagnosticView />}
      {hideTabs || !installed ? null : (
        <nav className="tabs" aria-label="Main">
          <button type="button" className={tab === "today" ? "active" : ""} onClick={() => go({ name: "today" })}>Today</button>
          <button type="button" className={tab === "dictionary" ? "active" : ""} onClick={() => go({ name: "dictionary", q: "" })}>Dictionary</button>
          <button type="button" className={tab === "words" ? "active" : ""} onClick={() => go({ name: "words" })}>My Words</button>
          <button type="button" className={tab === "progress" ? "active" : ""} onClick={() => go({ name: "progress" })}>Progress</button>
        </nav>
      )}
    </div>
  );
}
