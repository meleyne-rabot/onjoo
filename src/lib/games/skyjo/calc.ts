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
export const TARGET_SCORE = 100;

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

// Contrairement à la plupart des jeux, c'est le score le plus BAS qui
// gagne à Skyjo.
export function determineWinners(totals: Record<string, number>): string[] {
  const entries = Object.entries(totals);
  if (entries.length === 0) return [];
  const min = Math.min(...entries.map(([, value]) => value));
  return entries.filter(([, value]) => value === min).map(([id]) => id);
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

// Marge d'alerte avant le seuil de fin de partie (ex. dès 70 pts sur 100).
export const APPROACHING_MARGIN = 30;

export function playersApproachingTarget(
  totals: Record<string, number>,
): string[] {
  return Object.entries(totals)
    .filter(([, value]) => value >= TARGET_SCORE - APPROACHING_MARGIN && value < TARGET_SCORE)
    .map(([id]) => id);
}
