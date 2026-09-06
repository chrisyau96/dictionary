export function ScoreBadge({ score }: { score: number | null }) {
  const label = score === null ? "Frequency not measured" : `Score ${score}. Frequency in general English.`;
  return (
    <div className="score-badge" title="Commonness from wordfreq Zipf, scale v1. Not a CEFR level.">
      <span className="score-caption">Score</span>
      <span className="score-value">{score === null ? "—" : score}</span>
      <span className="score-denom">Frequency</span>
      <span className="visually-hidden">{label}</span>
    </div>
  );
}
