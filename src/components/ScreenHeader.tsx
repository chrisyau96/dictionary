import type { ReactNode } from "react";
import { BackIcon } from "./icons";
import { go, type Route } from "../router";

function goBack(to: Route | "history") {
  if (to === "history") window.history.back();
  else go(to);
}

export function BackButton({
  to,
  onClick,
  label = "Back",
  className = "back-btn",
}: {
  to?: Route | "history";
  onClick?: () => void;
  label?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={className}
      aria-label={label}
      onClick={() => {
        if (onClick) onClick();
        else if (to) goBack(to);
      }}
    >
      <BackIcon />
    </button>
  );
}

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
      <div className="page-header-row">
        {back ? <BackButton to={back} label={backLabel} /> : null}
        <div className="page-header-main">
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          {title ? <h1 className="page-title">{title}</h1> : null}
        </div>
        {right ? <div className="page-header-right">{right}</div> : null}
      </div>
      {subtitle ? <p className="lede">{subtitle}</p> : null}
    </header>
  );
}
