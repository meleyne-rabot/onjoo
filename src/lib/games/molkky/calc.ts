export type RoundDetail = Record<string, never>;

export type Round = {
  id: string;
  match_player_id: string;
  round_index: number;
  points: number;
  detail: RoundDetail;
};

export const TARGET_SCORE = 50;
export const BUST_RESET_SCORE = 25;
export const APPROACHING_THRESHOLD = 35;
export const MAX_THROW = 12;
export const MISSES_TO_ELIMINATE = 3;

type PlayerState = {
  total: number;
  consecutiveMisses: number;
  eliminated: boolean;
  finishedAtRound: number | null;
};

const INITIAL_STATE: PlayerState = {
  total: 0,
  consecutiveMisses: 0,
  eliminated: false,
  finishedAtRound: null,
};

// Rejoue tous les lancers d'un joueur dans l'ordre pour retrouver son état
// courant — rien n'est stocké tel quel en base (ni le total, ni éliminé),
// tout se déduit de la séquence brute des points par tour (0 à 12 = points
// marqués sur ce lancer). maxRound optionnel : pour savoir où en était un
// joueur juste avant un tour donné (cf. activeRoundIndex).
function replay(rounds: Round[], matchPlayerId: string, maxRound = Infinity): PlayerState {
  const throws = rounds
    .filter((r) => r.match_player_id === matchPlayerId && r.round_index <= maxRound)
    .sort((a, b) => a.round_index - b.round_index);

  let state = { ...INITIAL_STATE };

  for (const t of throws) {
    if (state.eliminated || state.finishedAtRound !== null) break;
    if (t.points === 0) {
      const consecutiveMisses = state.consecutiveMisses + 1;
      state = {
        ...state,
        consecutiveMisses,
        eliminated: consecutiveMisses >= MISSES_TO_ELIMINATE,
      };
    } else {
      let total = state.total + t.points;
      if (total > TARGET_SCORE) total = BUST_RESET_SCORE;
      state = {
        ...state,
        total,
        consecutiveMisses: 0,
        finishedAtRound: total === TARGET_SCORE ? t.round_index : null,
      };
    }
  }

  return state;
}

export function cumulativeTotals(rounds: Round[], participantIds: string[]): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const id of participantIds) totals[id] = replay(rounds, id).total;
  return totals;
}

export function eliminatedPlayers(rounds: Round[], participantIds: string[]): Set<string> {
  const eliminated = new Set<string>();
  for (const id of participantIds) {
    if (replay(rounds, id).eliminated) eliminated.add(id);
  }
  return eliminated;
}

export function finishedPlayers(rounds: Round[], participantIds: string[]): Set<string> {
  const finished = new Set<string>();
  for (const id of participantIds) {
    if (replay(rounds, id).finishedAtRound !== null) finished.add(id);
  }
  return finished;
}

// Le tour à partir duquel un joueur n'a plus à lancer (éliminé ou déjà à
// 50) — sert à griser ses cases dans les tours suivants plutôt que de les
// laisser éditables indéfiniment.
export function outAtRound(rounds: Round[], participantIds: string[]): Record<string, number | null> {
  const result: Record<string, number | null> = {};
  for (const id of participantIds) {
    const throws = rounds
      .filter((r) => r.match_player_id === id)
      .sort((a, b) => a.round_index - b.round_index);
    let state = { ...INITIAL_STATE };
    let outRound: number | null = null;
    for (const t of throws) {
      if (state.eliminated || state.finishedAtRound !== null) break;
      if (t.points === 0) {
        const consecutiveMisses = state.consecutiveMisses + 1;
        state = { ...state, consecutiveMisses, eliminated: consecutiveMisses >= MISSES_TO_ELIMINATE };
      } else {
        let total = state.total + t.points;
        if (total > TARGET_SCORE) total = BUST_RESET_SCORE;
        state = { ...state, total, consecutiveMisses: 0, finishedAtRound: total === TARGET_SCORE ? t.round_index : null };
      }
      if (state.eliminated || state.finishedAtRound !== null) outRound = t.round_index;
    }
    result[id] = outRound;
  }
  return result;
}

// Approche du 50 : un petit coup de pouce visuel, pas une règle du jeu.
export function playersApproachingTarget(totals: Record<string, number>): string[] {
  return Object.entries(totals)
    .filter(([, total]) => total > APPROACHING_THRESHOLD && total < TARGET_SCORE)
    .map(([id]) => id);
}

// Le premier à atteindre exactement 50 gagne — pas forcément celui qui a
// le total le plus haut À L'INSTANT T (le dépassement fait retomber à 25,
// donc comparer les totaux actuels ne suffit pas à désigner un gagnant).
export function determineWinners(rounds: Round[], participantIds: string[]): string[] {
  const states = participantIds.map((id) => ({ id, ...replay(rounds, id) }));
  const finishers = states.filter((s) => s.finishedAtRound !== null);
  if (finishers.length === 0) return [];
  const earliestRound = Math.min(...finishers.map((s) => s.finishedAtRound as number));
  return finishers.filter((s) => s.finishedAtRound === earliestRound).map((s) => s.id);
}

// Un tour = tout le monde encore en jeu (ni éliminé, ni déjà à 50) a
// lancé. Les joueurs sortis avant ce tour ne sont pas comptés.
export function activeRoundIndex(rounds: Round[], participantIds: string[]): number {
  let round = 1;
  while (round <= 300) {
    const stillIn = participantIds.filter((id) => {
      const state = replay(rounds, id, round - 1);
      return !state.eliminated && state.finishedAtRound === null;
    });
    if (stillIn.length === 0) return round;
    const allEntered = stillIn.every((id) =>
      rounds.some((r) => r.match_player_id === id && r.round_index === round),
    );
    if (!allEntered) return round;
    round += 1;
    if (round > 300) return round;
  }
  return round;
}

export function lastRoundIndexWithData(rounds: Round[]): number | null {
  if (rounds.length === 0) return null;
  return Math.max(...rounds.map((r) => r.round_index));
}
