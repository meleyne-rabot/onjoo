export type RoundDetail = Record<string, never>;

export type Round = {
  id: string;
  match_player_id: string;
  round_index: number;
  points: number;
  detail: RoundDetail;
};

// La partie s'arrête dès qu'un joueur atteint ou dépasse ce score (à
// confirmer manuellement via "Terminer la partie").
export const TARGET_SCORE = 200;

export function cumulativeTotals(
  rounds: Round[],
  matchPlayerIds: string[],
): Record<string, number> {
  const totals: Record<string, number> = Object.fromEntries(
    matchPlayerIds.map((id) => [id, 0]),
  );
  for (const round of rounds) {
    totals[round.match_player_id] =
      (totals[round.match_player_id] ?? 0) + round.points;
  }
  return totals;
}

export function determineWinners(totals: Record<string, number>): string[] {
  const entries = Object.entries(totals);
  if (entries.length === 0) return [];
  const max = Math.max(...entries.map(([, value]) => value));
  return entries.filter(([, value]) => value === max).map(([id]) => id);
}

export function totalMatchPoints(rounds: Round[]): number {
  return rounds.reduce((sum, round) => sum + round.points, 0);
}

// Le tour le plus haut pour lequel TOUS les participants ont une valeur
// saisie. Au-delà commence le tour "actif", en cours de saisie.
export function maxCompleteRoundIndex(
  rounds: Round[],
  matchPlayerIds: string[],
): number {
  if (matchPlayerIds.length === 0) return 0;
  const countByRound = new Map<number, number>();
  for (const round of rounds) {
    countByRound.set(
      round.round_index,
      (countByRound.get(round.round_index) ?? 0) + 1,
    );
  }
  let max = 0;
  for (const [roundIndex, count] of countByRound) {
    if (count >= matchPlayerIds.length && roundIndex > max) max = roundIndex;
  }
  return max;
}

export function activeRoundIndex(
  rounds: Round[],
  matchPlayerIds: string[],
): number {
  return maxCompleteRoundIndex(rounds, matchPlayerIds) + 1;
}

export function lastRoundIndexWithData(rounds: Round[]): number | null {
  if (rounds.length === 0) return null;
  return Math.max(...rounds.map((round) => round.round_index));
}

export function playersOverTarget(totals: Record<string, number>): string[] {
  return Object.entries(totals)
    .filter(([, value]) => value >= TARGET_SCORE)
    .map(([id]) => id);
}

// Marge avant le seuil de fin de partie (ex. dès 170 pts sur 200) : ici
// pas une alerte mais une indication qu'on approche d'une victoire
// possible, le score le plus HAUT gagnant à Flip 7.
export const APPROACHING_MARGIN = 30;

export function playersApproachingTarget(
  totals: Record<string, number>,
): string[] {
  return Object.entries(totals)
    .filter(([, value]) => value >= TARGET_SCORE - APPROACHING_MARGIN && value < TARGET_SCORE)
    .map(([id]) => id);
}
