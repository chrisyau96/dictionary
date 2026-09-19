import { useEffect, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { db, ensureProfile } from "./db/database";
import { loadPackSummary } from "./content/install";
import { dismissPackUpdates, packBannerDismissed, REQUIRED_PACK_ID, type PackUpdateSummary } from "./content/packs";
import { parseHash, type Route, go } from "./router";
import { applyAccent, DEFAULT_ACCENT } from "./theme/accents";
import { TabBar } from "./components/TabBar";
import { CloseIcon } from "./components/icons";
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

function resetWindowScroll() {
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

export function App() {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));
  const [ready, setReady] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [packSummary, setPackSummary] = useState<PackUpdateSummary | null>(null);
  const [packBannerHidden, setPackBannerHidden] = useState(false);
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({ immediate: true });

  useEffect(() => {
    if ("scrollRestoration" in window.history) window.history.scrollRestoration = "manual";
    const onHash = () => setRoute(parseHash(window.location.hash));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    const skip = route.name === "settings" && Boolean(route.focus);
    if (skip) return;
    resetWindowScroll();
    const frame = window.requestAnimationFrame(resetWindowScroll);
    return () => window.cancelAnimationFrame(frame);
  }, [route]);

  useEffect(() => {
    void ensureProfile().then((profile) => applyAccent(profile.accentId || DEFAULT_ACCENT));
  }, []);

  useEffect(() => {
    void db.packs.get(REQUIRED_PACK_ID).then((pack) => {
      const ok = pack?.status === "installed";
      setInstalled(ok);
      setReady(true);
      if (!ok && route.name !== "install") go({ name: "install" });
    });
  }, [route.name]);

  useEffect(() => {
    if (!installed) return;
    void loadPackSummary()
      .then((summary) => {
        setPackSummary(summary);
        setPackBannerHidden(packBannerDismissed(summary.pending));
      })
      .catch(() => {
        setPackSummary(null);
        setPackBannerHidden(true);
      });
  }, [installed, route.name]);

  if (!ready) return <p className="muted">Opening local records…</p>;

  const tab = currentTab(route);
  const hideTabs = route.name === "install";
  const hidePackBanner =
    packBannerHidden ||
    !packSummary?.pending.length ||
    route.name === "install" ||
    route.name === "entry" ||
    route.name === "review" ||
    route.name === "settings";
  const showPackBanner = Boolean(packSummary?.pending.length) && !hidePackBanner;

  return (
    <div className="app">
      {needRefresh ? (
        <div className="update-banner">
          <span>A new app version is ready. Your learning records stay on this device.</span>
          <div className="banner-actions">
            <button type="button" className="ghost" onClick={() => updateServiceWorker(true)}>
              Update
            </button>
          </div>
        </div>
      ) : null}
      {showPackBanner ? (
        <div className="update-banner pack-banner">
          <span>A word pack update is ready.</span>
          <div className="banner-actions">
            <button type="button" className="ghost" onClick={() => go({ name: "settings", focus: "pack" })}>
              View
            </button>
            <button
              type="button"
              className="icon-btn banner-close"
              aria-label="Close notification"
              onClick={() => {
                if (packSummary) dismissPackUpdates(packSummary.pending);
                setPackBannerHidden(true);
              }}
            >
              <CloseIcon />
            </button>
          </div>
        </div>
      ) : null}
      {route.name === "today" && <TodayView />}
      {route.name === "dictionary" && <DictionaryView initialQuery={route.q} />}
      {route.name === "entry" && <EntryView entryId={route.entryId} senseId={route.senseId} />}
      {route.name === "words" && <MyWordsView />}
      {route.name === "progress" && <ProgressView />}
      {route.name === "settings" && <SettingsView focus={route.focus} />}
      {route.name === "review" && <ReviewView />}
      {route.name === "install" && <InstallView />}
      {hideTabs || !installed ? null : <TabBar current={tab} />}
    </div>
  );
}
