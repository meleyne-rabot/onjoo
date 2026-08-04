import type { SupabaseClient } from "@supabase/supabase-js";
import { isLikelyQwirkle } from "./calc";

type MatchPlayerRow = { final_score: number | null };
type RoundRow = { points: number; detail: { qwirkle?: boolean } | null };
type LeagueMatchRow = { id: string; match_players: MatchPlayerRow[] | null; rounds: RoundRow[] | null };

function countQwirkles(rounds: RoundRow[]): number {
  return rounds.filter((r) => {
    const explicit = r.detail?.qwirkle;
    return explicit === true || (explicit === undefined && isLikelyQwirkle(r.points));
  }).length;
}

export type MatchRanking = {
  totalMatches: number;
  totalPointsRank: number;
  totalQwirklesRank: number;
  // Par match_player_id (pas par joueur global) : où se classe SON score
  // dans cette partie parmi tous ses scores personnels dans cette ligue.
  personalBestRanks: Record<string, { rank: number; totalGames: number }>;
};

// Classe une partie tout juste terminée parmi toutes les parties Qwirkle
// déjà jouées dans la ligue — appelé une fois, juste après avoir marqué la
// partie comme terminée, pour l'afficher dans le popup de victoire.
export async function computeMatchRanking(
  supabase: SupabaseClient,
  leagueId: string,
  matchId: string,
  players: { matchPlayerId: string; playerId: string | null; score: number }[],
): Promise<MatchRanking | null> {
  const { data: matches } = await supabase
    .from("matches")
    .select("id, match_players(final_score), rounds(points, detail)")
    .eq("league_id", leagueId)
    .eq("game_code", "qwirkle")
    .eq("status", "completed")
    .returns<LeagueMatchRow[]>();

  if (!matches) return null;

  const summaries = matches.map((m) => ({
    id: m.id,
    total: (m.match_players ?? []).reduce((sum, mp) => sum + (mp.final_score ?? 0), 0),
    qwirkles: countQwirkles(m.rounds ?? []),
  }));

  const byTotal = [...summaries].sort((a, b) => b.total - a.total);
  const byQwirkles = [...summaries].sort((a, b) => b.qwirkles - a.qwirkles);

  const totalPointsRank = byTotal.findIndex((s) => s.id === matchId) + 1;
  const totalQwirklesRank = byQwirkles.findIndex((s) => s.id === matchId) + 1;

  const personalBestRanks: Record<string, { rank: number; totalGames: number }> = {};
  for (const p of players) {
    if (!p.playerId) continue; // joueur ponctuel, sans identité à suivre dans le temps

    const { data: personalMatches } = await supabase
      .from("match_players")
      .select("final_score, matches!inner(league_id, game_code, status)")
      .eq("player_id", p.playerId)
      .eq("matches.league_id", leagueId)
      .eq("matches.game_code", "qwirkle")
      .eq("matches.status", "completed")
      .returns<{ final_score: number | null }[]>();

    const scores = (personalMatches ?? []).map((r) => r.final_score ?? 0);
    const rank = scores.filter((s) => s > p.score).length + 1;
    personalBestRanks[p.matchPlayerId] = { rank, totalGames: scores.length };
  }

  return { totalMatches: summaries.length, totalPointsRank, totalQwirklesRank, personalBestRanks };
}
