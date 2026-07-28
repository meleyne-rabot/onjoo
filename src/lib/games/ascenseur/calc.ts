// bid/actual vivent tous les deux dans detail (pas dans points) : ça
// permet de distinguer "pas encore annoncé/joué" (undefined) de "annoncé/
// réalisé zéro pli" (0), une distinction que la colonne points seule
// (not null) ne peut pas représenter.
export type RoundDetail = { bid?: number; actual?: number };

export type Round = {
  id: string;
  match_player_id: string;
  round_index: number;
  points: number; // miroir de detail.actual (contrainte not null), non utilisé pour le calcul
  detail: RoundDetail;
};

export type RoundPlan = {
  index: number;
  cards: number;
  hasTrump: boolean;
};

// 52 cartes (les jokers ne comptent pas, on joue de 1 à Roi) : montée
// avec atout de 1 au max de cartes, un palier au max sans atout, puis
// descente avec atout jusqu'à 1.
const DECK_SIZE = 52;

export function buildRoundPlan(numPlayers: number): RoundPlan[] {
  if (numPlayers <= 0) return [];
  const maxCards = Math.max(1, Math.floor(DECK_SIZE / numPlayers));
  const plan: RoundPlan[] = [];
  let index = 1;
  for (let c = 1; c <= maxCards; c++) {
    plan.push({ index: index++, cards: c, hasTrump: true });
  }
  plan.push({ index: index++, cards: maxCards, hasTrump: false });
  for (let c = maxCards - 1; c >= 1; c--) {
    plan.push({ index: index++, cards: c, hasTrump: true });
  }
  return plan;
}

// Contrat tenu (pari = réalisé) : 10 pts de base + 5 par pli réalisé.
// Contrat manqué (au-dessus ou en dessous) : -5 par pli d'écart.
export function roundScore(bid: number | undefined, actual: number | undefined): number {
  if (bid === undefined || actual === undefined) return 0;
  if (bid === actual) return 10 + 5 * actual;
  return -5 * Math.abs(actual - bid);
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
      (totals[round.match_player_id] ?? 0) + roundScore(round.detail?.bid, round.detail?.actual);
  }
  return totals;
}

export function determineWinners(totals: Record<string, number>): string[] {
  const entries = Object.entries(totals);
  if (entries.length === 0) return [];
  const max = Math.max(...entries.map(([, value]) => value));
  return entries.filter(([, value]) => value === max).map(([id]) => id);
}

// L'ordre d'annonce tourne d'un cran à chaque tour (celui qui annonce
// en premier change) : le dernier de la liste est désavantagé (il
// connaît déjà tous les autres paris, cf. règle de la somme interdite).
export function bidOrderForRound(baseOrder: string[], roundIndex: number): string[] {
  const n = baseOrder.length;
  if (n === 0) return [];
  const offset = (roundIndex - 1) % n;
  return [...baseOrder.slice(offset), ...baseOrder.slice(0, offset)];
}

export function totalBids(rounds: Round[], roundIndex: number): number {
  return rounds
    .filter((r) => r.round_index === roundIndex && r.detail?.bid !== undefined)
    .reduce((sum, r) => sum + (r.detail?.bid ?? 0), 0);
}

// Un tour est "complet" quand tout le monde a un réalisé enregistré —
// sert à déterminer jusqu'où révéler les tours suivants.
export function isRoundComplete(
  rounds: Round[],
  roundIndex: number,
  matchPlayerIds: string[],
): boolean {
  return matchPlayerIds.every((id) =>
    rounds.some(
      (r) => r.match_player_id === id && r.round_index === roundIndex && r.detail?.actual !== undefined,
    ),
  );
}
