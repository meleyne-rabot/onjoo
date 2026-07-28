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
  { index: 12, id: "yams", label: "Yam's", section: "lower" },
  { index: 13, id: "chance", label: "Chance", section: "lower" },
];

const UPPER_MAX_INDEX = 6;

// Valeur de face pour les catégories de la partie supérieure (icône dé
// + calcul des pastilles de l'accordéon : 0 à 5 dés de cette face).
export const UPPER_FACE: Record<string, number> = {
  un: 1,
  deux: 2,
  trois: 3,
  quatre: 4,
  cinq: 5,
  six: 6,
};

// Brelan/Carré ne comptent que les dés identiques (jamais les 5) : la
// valeur est toujours un multiple de la face obtenue (3 ou 4 dés).
const MULTIPLE_OF: Record<string, number> = {
  brelan: 3,
  carre: 4,
};

// Full/Petite suite/Yam's n'ont qu'une seule valeur possible (obtenu ou pas).
const FIXED_VALUE: Record<string, number> = {
  full: 25,
  petite_suite: 25,
  yams: 50,
};

export type PillOption = { value: number; label: string; sublabel?: string };

// Grande suite a 2 valeurs possibles selon la suite obtenue (par le haut
// ou par le bas) — seule cette figure a cette variante chez cette famille.
const SUITE_OPTIONS: Record<string, PillOption[]> = {
  grande_suite: [
    { value: 30, label: "30", sublabel: "1-2-3-4-5" },
    { value: 40, label: "40", sublabel: "2-3-4-5-6" },
  ],
};

// Pastilles de score déjà calculées pour une catégorie — null si la
// valeur est trop variable pour être pré-calculée (Chance uniquement,
// reste en saisie libre).
export function categoryOptions(categoryId: string): PillOption[] | null {
  const face = UPPER_FACE[categoryId];
  if (face !== undefined) {
    return [0, 1, 2, 3, 4, 5].map((n) => ({ value: n * face, label: String(n * face) }));
  }
  const multiplier = MULTIPLE_OF[categoryId];
  if (multiplier !== undefined) {
    return [0, 1, 2, 3, 4, 5, 6].map((face2) => ({
      value: face2 * multiplier,
      label: String(face2 * multiplier),
    }));
  }
  const fixed = FIXED_VALUE[categoryId];
  if (fixed !== undefined) {
    return [
      { value: 0, label: "Aucun" },
      { value: fixed, label: `${fixed} pts` },
    ];
  }
  const suite = SUITE_OPTIONS[categoryId];
  if (suite) return [{ value: 0, label: "0" }, ...suite];
  return null;
}

export function categorySublabel(categoryId: string): string | undefined {
  if (categoryId === "brelan") return "3 dés identiques";
  if (categoryId === "carre") return "4 dés identiques";
  return undefined;
}

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
