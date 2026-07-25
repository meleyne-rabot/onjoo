import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GAME_REGISTRY, isSupportedGame } from "@/lib/games/registry";

type PlayerRow = {
  id: string;
  name: string;
  avatar_color: string;
  avatar_shape: string;
};

export default async function MatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: match } = await supabase
    .from("matches")
    .select("id, game_code, status")
    .eq("id", id)
    .single();

  if (!match) notFound();

  if (!isSupportedGame(match.game_code)) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 text-center">
        <p>Ce jeu n&apos;est pas encore pris en charge.</p>
      </main>
    );
  }

  const [{ data: matchPlayers }, { data: rounds }] = await Promise.all([
    supabase
      .from("match_players")
      .select("player_id, players(id, name, avatar_color, avatar_shape)")
      .eq("match_id", id),
    supabase
      .from("rounds")
      .select("id, player_id, round_index, points")
      .eq("match_id", id)
      .order("round_index", { ascending: true }),
  ]);

  const players: PlayerRow[] = (matchPlayers ?? [])
    .map((mp) => (Array.isArray(mp.players) ? mp.players[0] : mp.players))
    .filter((p): p is PlayerRow => Boolean(p));

  const { ScoreScreen } = GAME_REGISTRY[match.game_code];

  return (
    <ScoreScreen
      matchId={match.id}
      players={players}
      initialRounds={rounds ?? []}
      initialStatus={match.status as "in_progress" | "completed"}
    />
  );
}
