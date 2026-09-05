import { commonnessLabel } from "../content/commonness";

export function CommonnessBadge({ score }: { score: number | null }) {
  return (
    <span className="badge" title="App display score from wordfreq Zipf, scale v1. Not a CEFR level.">
      {score === null ? "Not measured" : `${score} · ${commonnessLabel(score)}`}
    </span>
  );
}
