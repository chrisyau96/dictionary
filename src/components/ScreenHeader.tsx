import type { ReactNode } from "react";
import { go, type Route } from "../router";

export function ScreenHeader({
  title,
  back,
  right,
}: {
  title: string;
  back?: Route | "history";
  right?: ReactNode;
}) {
  return (
    <header className="topbar">
      {back ? (
        <button
          type="button"
          className="back-btn"
          onClick={() => {
            if (back === "history") window.history.back();
            else go(back);
          }}
        >
          Back
        </button>
      ) : (
        <span className="topbar-side" />
      )}
      <h1>{title}</h1>
      <div className="topbar-side topbar-right">{right}</div>
    </header>
  );
}
