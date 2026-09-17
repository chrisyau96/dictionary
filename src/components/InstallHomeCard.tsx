import { useEffect, useState } from "react";
import { canPromptInstall, isStandaloneDisplay, promptInstall, subscribeInstall } from "../pwa/install";

function isIosDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function InstallHomeCard({ compact = false }: { compact?: boolean }) {
  const [standalone, setStandalone] = useState(isStandaloneDisplay());
  const [canPrompt, setCanPrompt] = useState(canPromptInstall());
  const [note, setNote] = useState("");

  useEffect(() => {
    const sync = () => {
      setStandalone(isStandaloneDisplay());
      setCanPrompt(canPromptInstall());
    };
    sync();
    return subscribeInstall(sync);
  }, []);

  if (standalone) {
    return compact ? null : <p className="tiny helper-copy">This app is already on your Home Screen.</p>;
  }

  async function install() {
    const result = await promptInstall();
    if (result === "accepted") setNote("Added to your Home Screen.");
    else if (result === "dismissed") setNote("Install was dismissed. You can try again from here.");
    else setNote("");
  }

  if (compact) {
    if (canPrompt) {
      return (
        <button type="button" className="ghost block" onClick={() => void install()}>
          Add to Home Screen
        </button>
      );
    }
    return (
      <p className="tiny helper-copy">
        {isIosDevice()
          ? "On iPhone: tap Share, then Add to Home Screen."
          : "Add this app from Settings → Home screen when your browser offers it."}
      </p>
    );
  }

  return (
    <div className="stack tight">
      {canPrompt ? (
        <button type="button" className="primary block" onClick={() => void install()}>
          Add to Home Screen
        </button>
      ) : null}
      <p className="tiny helper-copy">
        {isIosDevice()
          ? "Safari: tap the Share button, then Add to Home Screen. The app opens on its own, like a downloaded app."
          : "Chrome or Edge can install this as an app. Use the button above when it appears, or the browser’s Install / Add to Home Screen menu."}
      </p>
      {note ? <p className="tiny">{note}</p> : null}
    </div>
  );
}
