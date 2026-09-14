import type { ReactNode } from "react";
import { BackIcon } from "./icons";
import { go, type Route } from "../router";

export function ScreenHeader({
  title,
  back,
  backLabel = "Back",
  right,
  eyebrow,
  subtitle,
}: {
  title?: string;
  back?: Route | "history";
  backLabel?: string;
  right?: ReactNode;
  eyebrow?: ReactNode;
  subtitle?: ReactNode;
}) {
  return (
    <header className="page-header">
      {back || right ? (
        <div className="page-header-top">
          {back ? (
            <button
              type="button"
              className="icon-btn"
              aria-label={backLabel}
              onClick={() => {
                if (back === "history") window.history.back();
                else go(back);
              }}
            >
              <BackIcon />
            </button>
          ) : (
            <span />
          )}
          {right ? <div className="page-header-right">{right}</div> : null}
        </div>
      ) : null}
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      {title ? <h1 className="page-title">{title}</h1> : null}
      {subtitle ? <p className="lede">{subtitle}</p> : null}
    </header>
  );
}
