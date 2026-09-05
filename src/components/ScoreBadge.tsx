import { commonnessLabel } from "../content/commonness";

export function ScoreBadge({ score }: { score: number | null }) {
  const label = score === null ? "Not measured" : `${score} / 100 · ${commonnessLabel(score)}`;
  return (
    <div className="score-badge" title="App commonness score from wordfreq Zipf, scale v1. Not a CEFR level or personal usefulness.">
      <span className="score-value">{score === null ? "—" : score}</span>
      <span className="score-denom">/100</span>
      <span className="visually-hidden">{label}</span>
    </div>
  );
}
