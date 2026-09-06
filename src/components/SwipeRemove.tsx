import type { ReactNode } from "react";

export function SwipeRemove({
  children,
  onRemove,
}: {
  children: ReactNode;
  onRemove: () => void;
}) {
  return (
    <div className="swipe-row">
      <div className="swipe-track">
        <div className="swipe-front">{children}</div>
        <button type="button" className="swipe-remove" onClick={onRemove}>
          Remove
        </button>
      </div>
    </div>
  );
}
