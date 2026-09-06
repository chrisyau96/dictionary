import { useRef, useState, type PointerEvent, type ReactNode } from "react";

const REVEAL = 88;

export function SwipeRemove({
  children,
  onRemove,
}: {
  children: ReactNode;
  onRemove: () => void;
}) {
  const origin = useRef({ x: 0, y: 0, start: 0 });
  const axis = useRef<"h" | "v" | null>(null);
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);

  function ignoreTarget(event: PointerEvent<HTMLDivElement>): boolean {
    return Boolean((event.target as HTMLElement | null)?.closest("input, textarea, a, .speaker-btn, .note-field"));
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (ignoreTarget(event)) return;
    origin.current = { x: event.clientX, y: event.clientY, start: offset };
    axis.current = null;
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    const dx = event.clientX - origin.current.x;
    const dy = event.clientY - origin.current.y;
    if (!axis.current) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      axis.current = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
    }
    if (axis.current !== "h") return;
    event.preventDefault();
    setOffset(Math.min(0, Math.max(-REVEAL, origin.current.start + dx)));
  }

  function onPointerUp() {
    if (!dragging) return;
    setDragging(false);
    setOffset((current) => (current < -REVEAL / 3 ? -REVEAL : 0));
  }

  return (
    <div className="swipe-row">
      <button type="button" className="swipe-remove" onClick={onRemove} tabIndex={offset === 0 ? -1 : 0}>
        Remove
      </button>
      <div
        className={`swipe-front${dragging ? " is-dragging" : ""}`}
        style={{ transform: `translateX(${offset}px)` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {children}
      </div>
    </div>
  );
}
