import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GAME_REGISTRY, isSupportedGame } from "@/lib/games/registry";
import { GUEST_PLACEHOLDER_AVATAR } from "@/lib/avatar";
import { getMyPlayer } from "@/lib/player";
import { getMyRole } from "@/lib/league";

type PlayerJoin = {
  name: string;
  avatar_color: string;
  avatar_shape: string;
};

type MatchPlayerRow = {
  id: string;
  player_id: string | null;
  guest_name: string | null;
  finished_board: boolean;
  turn_order: number | null;
  created_at: string;
  players: PlayerJoin | PlayerJoin[] | null;
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
    .select("id, league_id, game_code, status")
    .eq("id", id)
    .single();

  if (!match) notFound();

  if (!isSupportedGame(match.game_code)) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 text-center">
        <p className="font-quicksand text-[#777]">
          Ce jeu n&apos;est pas encore pris en charge.
        </p>
      </main>
    );
  }

  const [
    { data: matchPlayers, error: matchPlayersError },
    { data: rounds, error: roundsError },
    myPlayer,
    myRole,
  ] = await Promise.all([
    supabase
      .from("match_players")
      .select(
        "id, player_id, guest_name, finished_board, turn_order, created_at, players(name, avatar_color, avatar_shape)",
      )
      .eq("match_id", id)
      .order("turn_order", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true }),
    supabase
      .from("rounds")
      .select("id, match_player_id, round_index, points, detail")
      .eq("match_id", id)
      .order("round_index", { ascending: true }),
    getMyPlayer(match.league_id),
    getMyRole(match.league_id),
  ]);

  if (matchPlayersError) {
    throw new Error(matchPlayersError.message);
  }
  if (roundsError) {
    throw new Error(roundsError.message);
  }
  // Un observateur (accès support) n'a jamais de fiche joueur — on ne le
  // force pas à en créer une juste pour regarder/dépanner une partie.
  if (!myPlayer && myRole !== "observer") redirect("/players/setup");

  const rows = (matchPlayers ?? []) as MatchPlayerRow[];

  const participants = rows.map((mp) => {
    const player = Array.isArray(mp.players) ? mp.players[0] : mp.players;
    if (player) {
      return {
        id: mp.id,
        playerId: mp.player_id,
        name: player.name,
        avatarColor: player.avatar_color,
        avatarShape: player.avatar_shape,
      };
    }
    return {
      id: mp.id,
      playerId: null,
      name: mp.guest_name ?? "Invité",
      avatarColor: GUEST_PLACEHOLDER_AVATAR.color,
      avatarShape: GUEST_PLACEHOLDER_AVATAR.shape,
    };
  });

  const hasTurnOrder = rows.length > 0 && rows.every((r) => r.turn_order !== null);
  const initialFinisherId = rows.find((r) => r.finished_board)?.id ?? null;

  const { ScoreScreen } = GAME_REGISTRY[match.game_code];

  return (
    <ScoreScreen
      matchId={match.id}
      leagueId={match.league_id}
      gameCode={match.game_code}
      participants={participants}
      initialRounds={rounds ?? []}
      initialStatus={match.status as "in_progress" | "completed"}
      initialFinisherId={initialFinisherId}
      initialTurnOrderSet={hasTurnOrder}
      me={
        myPlayer && {
          id: myPlayer.id,
          name: myPlayer.name,
          avatarColor: myPlayer.avatar_color,
          avatarShape: myPlayer.avatar_shape,
        }
      }
    />
  );
}
