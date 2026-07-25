export type Round = {
  id: string;
  player_id: string;
  round_index: number;
  points: number;
};

// Un tour au-dessus de ce seuil est, en pratique de jeu, un signe quasi
// certain qu'un Qwirkle a été réalisé (cf. section 4 du spec).
export const QWIRKLE_THRESHOLD = 12;

export function isLikelyQwirkle(points: number): boolean {
  return points > QWIRKLE_THRESHOLD;
}

export function cumulativeTotals(
  rounds: Round[],
  playerIds: string[],
): Record<string, number> {
  const totals: Record<string, number> = Object.fromEntries(
    playerIds.map((id) => [id, 0]),
  );
  for (const round of rounds) {
    totals[round.player_id] = (totals[round.player_id] ?? 0) + round.points;
  }
  return totals;
}

export function estimatedQwirkleCounts(
  rounds: Round[],
  playerIds: string[],
): Record<string, number> {
  const counts: Record<string, number> = Object.fromEntries(
    playerIds.map((id) => [id, 0]),
  );
  for (const round of rounds) {
    if (isLikelyQwirkle(round.points)) {
      counts[round.player_id] = (counts[round.player_id] ?? 0) + 1;
    }
  }
  return counts;
}

export function totalMatchPoints(rounds: Round[]): number {
  return rounds.reduce((sum, round) => sum + round.points, 0);
}

export function determineWinners(totals: Record<string, number>): string[] {
  const entries = Object.entries(totals);
  if (entries.length === 0) return [];
  const max = Math.max(...entries.map(([, value]) => value));
  return entries.filter(([, value]) => value === max).map(([id]) => id);
}

export function nextRoundIndex(rounds: Round[]): number {
  if (rounds.length === 0) return 1;
  return Math.max(...rounds.map((round) => round.round_index)) + 1;
}

export function lastRoundIndex(rounds: Round[]): number | null {
  if (rounds.length === 0) return null;
  return Math.max(...rounds.map((round) => round.round_index));
}
