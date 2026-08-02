export type RoundDetail = Record<string, never>;

export type Round = {
  id: string;
  match_player_id: string;
  round_index: number;
  points: number;
  detail: RoundDetail;
};

export const DEFAULT_TARGET_SCORE = 21;

// Deux camps, chacun 1 ou 2 joueurs (équipe). Les coéquipiers d'un même
// camp reçoivent toujours le même score à chaque tour — pas de notion de
// score individuel en cours de partie, seulement à la fin (stats).
export type Sides = [string[], string[]];

// Si les camps sont déjà configurés (2v2, cf. matches.settings.sides), on
// les réutilise. Sinon, à 2 joueurs seulement, chacun est son propre camp
// — pas besoin de configuration explicite. À 4 joueurs sans configuration,
// on ne peut pas deviner les paires : null (l'écran affichera l'étape de
// configuration).
export function resolveSides(participantIds: string[], configuredSides: Sides | null): Sides | null {
  if (configuredSides && configuredSides[0].length > 0 && configuredSides[1].length > 0) {
    return configuredSides;
  }
  if (participantIds.length === 2) {
    return [[participantIds[0]], [participantIds[1]]];
  }
  return null;
}

export function sideIndexForPlayer(sides: Sides, matchPlayerId: string): 0 | 1 | null {
  if (sides[0].includes(matchPlayerId)) return 0;
  if (sides[1].includes(matchPlayerId)) return 1;
  return null;
}

// Le total d'un camp = la somme des points de n'importe lequel de ses
// membres (ils reçoivent toujours la même valeur à chaque tour) : on lit
// le premier membre comme représentant du camp.
export function sideTotals(rounds: Round[], sides: Sides): [number, number] {
  const totals = [0, 1].map((sideIdx) => {
    const memberId = sides[sideIdx][0];
    if (!memberId) return 0;
    return rounds
      .filter((r) => r.match_player_id === memberId)
      .reduce((sum, r) => sum + r.points, 0);
  });
  return [totals[0], totals[1]];
}

export function activeRoundIndex(rounds: Round[], sides: Sides): number {
  let round = 1;
  while (round <= 300) {
    const bothEntered = [0, 1].every((sideIdx) => {
      const memberId = sides[sideIdx][0];
      return memberId ? rounds.some((r) => r.match_player_id === memberId && r.round_index === round) : true;
    });
    if (!bothEntered) return round;
    round += 1;
  }
  return round;
}

export function lastRoundIndexWithData(rounds: Round[]): number | null {
  if (rounds.length === 0) return null;
  return Math.max(...rounds.map((r) => r.round_index));
}

// Le camp avec le total le plus haut, à condition d'avoir atteint le score
// cible — appelé seulement au moment de "Terminer la partie" (comme les
// autres jeux, pas de fin automatique).
export function determineWinningSide(totals: [number, number], targetScore: number): 0 | 1 | null {
  const [a, b] = totals;
  if (a < targetScore && b < targetScore) return null;
  if (a === b) return null;
  return a > b ? 0 : 1;
}
