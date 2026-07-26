export type RoundDetail = {
  qwirkle?: boolean;
};

export type Round = {
  id: string;
  match_player_id: string;
  round_index: number;
  points: number;
  detail: RoundDetail;
};

// Un tour au-dessus de ce seuil est, en pratique de jeu, un signe quasi
// certain qu'un Qwirkle a été réalisé (cf. section 4 du spec) — utilisé
// comme repli quand le joueur n'a pas confirmé explicitement via le
// toggle Qwirkle/Non de l'écran de score.
export const QWIRKLE_THRESHOLD = 12;

// Bonus de fin de partie pour le joueur qui vide son chevalet en premier.
export const FINISH_BOARD_BONUS = 6;

export function isLikelyQwirkle(points: number): boolean {
  return points > QWIRKLE_THRESHOLD;
}

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

export function estimatedQwirkleCounts(
  rounds: Round[],
  matchPlayerIds: string[],
): Record<string, number> {
  const counts: Record<string, number> = Object.fromEntries(
    matchPlayerIds.map((id) => [id, 0]),
  );
  for (const round of rounds) {
    const explicit = round.detail?.qwirkle;
    const isQwirkle =
      explicit === true || (explicit === undefined && isLikelyQwirkle(round.points));
    if (isQwirkle) {
      counts[round.match_player_id] = (counts[round.match_player_id] ?? 0) + 1;
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

export function applyFinishBonus(
  totals: Record<string, number>,
  finisherId: string | null,
  bonus: number = FINISH_BOARD_BONUS,
): Record<string, number> {
  if (!finisherId) return totals;
  return { ...totals, [finisherId]: (totals[finisherId] ?? 0) + bonus };
}
