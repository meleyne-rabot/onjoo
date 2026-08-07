export type RoundDetail = Record<string, never>;

export type Round = {
  id: string;
  match_player_id: string;
  round_index: number;
  points: number;
  detail: RoundDetail;
};

// La partie s'arrête dès qu'un cumul dépasse STRICTEMENT ce seuil (à
// confirmer manuellement via "Terminer la partie") — un cumul qui tombe
// PILE dessus ne compte pas comme dépassement, cf. cumulativeTotals.
export const TARGET_SCORE = 150;

// Rejoue la séquence brute des manches (jamais de score dérivé stocké) :
// nécessaire ici plus qu'ailleurs, la règle "pile 150 → redescend à 0"
// doit s'appliquer manche après manche dans l'ordre, pas seulement sur le
// total final (un cumul qui tombe pile à 150 au tour 3 doit repartir de 0
// pour le tour 4, pas rester à 150 jusqu'au bout).
export function cumulativeTotals(
  rounds: Round[],
  matchPlayerIds: string[],
): Record<string, number> {
  const totals: Record<string, number> = Object.fromEntries(
    matchPlayerIds.map((id) => [id, 0]),
  );
  const sorted = [...rounds].sort((a, b) => a.round_index - b.round_index);
  for (const round of sorted) {
    const next = (totals[round.match_player_id] ?? 0) + round.points;
    totals[round.match_player_id] = next === TARGET_SCORE ? 0 : next;
  }
  return totals;
}

// Contrairement à la plupart des jeux, c'est le score le plus BAS qui
// gagne au 5.
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

// Un cumul ne peut jamais rester stocké exactement à TARGET_SCORE (voir
// cumulativeTotals) : "dépassé" veut donc dire strictement au-dessus.
export function playersOverTarget(totals: Record<string, number>): string[] {
  return Object.entries(totals)
    .filter(([, value]) => value > TARGET_SCORE)
    .map(([id]) => id);
}

// Marge d'alerte avant le seuil de fin de partie.
export const APPROACHING_MARGIN = 30;

export function playersApproachingTarget(
  totals: Record<string, number>,
): string[] {
  return Object.entries(totals)
    .filter(([, value]) => value >= TARGET_SCORE - APPROACHING_MARGIN && value <= TARGET_SCORE)
    .map(([id]) => id);
}
