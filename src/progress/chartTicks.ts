export function pickXTicks(count: number): number[] {
  if (count <= 1) return [0];
  const last = count - 1;
  const target = count <= 10 ? 2 : count <= 40 ? 4 : 5;
  const raw = Array.from({ length: target }, (_, i) => Math.round((i * last) / Math.max(1, target - 1)));
  const unique = [...new Set(raw)].sort((a, b) => a - b);
  const minGap = Math.max(2, Math.floor(count / (target * 2)));
  const ticks = [unique[0] ?? 0];
  for (const index of unique.slice(1, -1)) {
    if (index - (ticks.at(-1) ?? 0) >= minGap) ticks.push(index);
  }
  const end = unique.at(-1) ?? last;
  if (end - (ticks.at(-1) ?? 0) < minGap && ticks.length > 1) ticks[ticks.length - 1] = end;
  else if (ticks.at(-1) !== end) ticks.push(end);
  return ticks;
}
