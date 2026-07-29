export type RoundDetail = Record<string, never>;

export type Round = {
  id: string;
  match_player_id: string;
  round_index: number;
  points: number; // cartes restant en main en fin de tour (0 = a gagné le tour)
  detail: RoundDetail;
};

// Règle officielle Mattel — beaucoup de familles jouent à un autre
// score, réglable par partie (pas une règle de ligue fixe).
export const DEFAULT_TARGET_SCORE = 500;

export function cumulativeTotals(
  rounds: Round[],
  matchPlayerIds: string[],
): Record<string, number> {
  const totals: Record<string, number> = Object.fromEntries(
    matchPlayerIds.map((id) => [id, 0]),
  );

  const byRound = new Map<number, Round[]>();
  for (const round of rounds) {
    const list = byRound.get(round.round_index) ?? [];
    list.push(round);
    byRound.set(round.round_index, list);
  }

  for (const roundRows of byRound.values()) {
    // Seul celui qui a vidé sa main (0 restant) marque : il récupère la
    // somme des cartes restant dans la main de TOUS les autres. On
    // n'attribue le tour que si un seul joueur est à 0 (donnée propre),
    // pas si personne ou plusieurs le sont (saisie encore incomplète).
    const winners = roundRows.filter((r) => r.points === 0);
    if (winners.length !== 1) continue;
    const winner = winners[0];
    const sumOthers = roundRows
      .filter((r) => r.match_player_id !== winner.match_player_id)
      .reduce((sum, r) => sum + r.points, 0);
    totals[winner.match_player_id] = (totals[winner.match_player_id] ?? 0) + sumOthers;
  }

  return totals;
}

export function determineWinners(totals: Record<string, number>): string[] {
  const entries = Object.entries(totals);
  if (entries.length === 0) return [];
  const max = Math.max(...entries.map(([, value]) => value));
  return entries.filter(([, value]) => value === max).map(([id]) => id);
}

export function maxCompleteRoundIndex(
  rounds: Round[],
  matchPlayerIds: string[],
): number {
  if (matchPlayerIds.length === 0) return 0;
  const countByRound = new Map<number, number>();
  for (const round of rounds) {
    countByRound.set(round.round_index, (countByRound.get(round.round_index) ?? 0) + 1);
  }
  let max = 0;
  for (const [roundIndex, count] of countByRound) {
    if (count >= matchPlayerIds.length && roundIndex > max) max = roundIndex;
  }
  return max;
}

export function activeRoundIndex(rounds: Round[], matchPlayerIds: string[]): number {
  return maxCompleteRoundIndex(rounds, matchPlayerIds) + 1;
}

export function lastRoundIndexWithData(rounds: Round[]): number | null {
  if (rounds.length === 0) return null;
  return Math.max(...rounds.map((round) => round.round_index));
}

export function playersOverTarget(
  totals: Record<string, number>,
  targetScore: number,
): string[] {
  return Object.entries(totals)
    .filter(([, value]) => value >= targetScore)
    .map(([id]) => id);
}
