import { frequencyBarCount, frequencyBarLabel } from "../content/commonness";

const HEIGHTS = [6, 10, 14, 18];

export function FrequencyBars({ score }: { score: number | null }) {
  const bars = frequencyBarCount(score);
  const label = frequencyBarLabel(score);
  return (
    <svg
      className={`freq-bars freq-${bars}`}
      viewBox="0 0 22 18"
      width="22"
      height="18"
      role="img"
      aria-label={label}
    >
      <title>{label}</title>
      {HEIGHTS.map((height, index) => {
        const x = index * 5.5;
        const y = 18 - height;
        const on = bars > 0 && index < bars;
        return <rect key={index} x={x} y={y} width="3.4" height={height} rx="1.05" className={on ? "bar-on" : "bar-off"} />;
      })}
    </svg>
  );
}
