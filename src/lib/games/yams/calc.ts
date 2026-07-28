export type RoundDetail = Record<string, never>;

// round_index (1-13) correspond à l'index de la catégorie dans CATEGORIES,
// pas à un "tour" répété comme dans les autres jeux : chaque catégorie
// n'est remplie qu'une seule fois, dans n'importe quel ordre.
export type Round = {
  id: string;
  match_player_id: string;
  round_index: number;
  points: number;
  detail: RoundDetail;
};

export type YamsSettings = {
  // Seuil (partie supérieure) et bonus associé — variable selon les
  // familles, cf. réglages de la ligue.
  bonusThreshold: number;
  bonusAmount: number;
};

export const DEFAULT_SETTINGS: YamsSettings = {
  bonusThreshold: 63,
  bonusAmount: 35,
};

export type Category = {
  index: number;
  id: string;
  label: string;
  section: "upper" | "lower";
};

export const CATEGORIES: Category[] = [
  { index: 1, id: "un", label: "Un", section: "upper" },
  { index: 2, id: "deux", label: "Deux", section: "upper" },
  { index: 3, id: "trois", label: "Trois", section: "upper" },
  { index: 4, id: "quatre", label: "Quatre", section: "upper" },
  { index: 5, id: "cinq", label: "Cinq", section: "upper" },
  { index: 6, id: "six", label: "Six", section: "upper" },
  { index: 7, id: "brelan", label: "Brelan", section: "lower" },
  { index: 8, id: "carre", label: "Carré", section: "lower" },
  { index: 9, id: "full", label: "Full", section: "lower" },
  { index: 10, id: "petite_suite", label: "Petite suite", section: "lower" },
  { index: 11, id: "grande_suite", label: "Grande suite", section: "lower" },
  { index: 12, id: "yams", label: "Yams", section: "lower" },
  { index: 13, id: "chance", label: "Chance", section: "lower" },
];

const UPPER_MAX_INDEX = 6;

export function upperSubtotal(rounds: Round[], matchPlayerId: string): number {
  return rounds
    .filter((r) => r.match_player_id === matchPlayerId && r.round_index <= UPPER_MAX_INDEX)
    .reduce((sum, r) => sum + r.points, 0);
}

export function upperBonus(subtotal: number, settings: YamsSettings): number {
  return subtotal >= settings.bonusThreshold ? settings.bonusAmount : 0;
}

export function cumulativeTotals(
  rounds: Round[],
  matchPlayerIds: string[],
  settings: YamsSettings,
): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const id of matchPlayerIds) {
    const subtotal = upperSubtotal(rounds, id);
    const bonus = upperBonus(subtotal, settings);
    const lowerSum = rounds
      .filter((r) => r.match_player_id === id && r.round_index > UPPER_MAX_INDEX)
      .reduce((sum, r) => sum + r.points, 0);
    totals[id] = subtotal + bonus + lowerSum;
  }
  return totals;
}

export function determineWinners(totals: Record<string, number>): string[] {
  const entries = Object.entries(totals);
  if (entries.length === 0) return [];
  const max = Math.max(...entries.map(([, value]) => value));
  return entries.filter(([, value]) => value === max).map(([id]) => id);
}
