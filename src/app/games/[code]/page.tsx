import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveLeague } from "@/lib/league";
import { gameMeta } from "@/lib/games/meta";
import { GameIcon } from "@/components/GameIcon";

type MatchPlayerRow = {
  final_score: number | null;
  is_winner: boolean;
  guest_name: string | null;
  players: { name: string } | { name: string }[] | null;
};

type RoundRow = {
  points: number;
  detail: { qwirkle?: boolean } | null;
};

function participantName(row: MatchPlayerRow): string | undefined {
  if (row.guest_name) return row.guest_name;
  return Array.isArray(row.players) ? row.players[0]?.name : row.players?.name;
}

// Un score >= 12 est un signe quasi certain de Qwirkle (cf. section 4 du
// spec), sauf confirmation/infirmation explicite via le toggle de l'écran
// de score (detail.qwirkle).
function countQwirkles(rounds: RoundRow[]): number {
  return rounds.filter((round) => {
    const explicit = round.detail?.qwirkle;
    return explicit === true || (explicit === undefined && round.points >= 12);
  }).length;
}

export default async function GameHistoryPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const league = await getActiveLeague();
  if (!league) redirect("/leagues/new");

  const supabase = await createClient();
  const { data: game } = await supabase
    .from("games")
    .select("code, name")
    .eq("code", code)
    .maybeSingle();

  if (!game) notFound();

  const { data: matches } = await supabase
    .from("matches")
    .select(
      "id, status, played_at, created_at, match_players(final_score, is_winner, guest_name, players(name)), rounds(points, detail)",
    )
    .eq("league_id", league.id)
    .eq("game_code", code)
    .order("created_at", { ascending: false });

  const meta = gameMeta(code);

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col gap-6 px-6 py-10">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <GameIcon category={meta.category} />
          <div className="flex flex-col gap-1">
            <Link href="/games" className="font-quicksand text-sm text-[#777]">
              ← Nos jeux
            </Link>
            <h1 className="font-fredoka text-2xl font-bold text-onjoo-green-900">
              {game.name}
            </h1>
          </div>
        </div>
        <Link href={`/games/${code}/new`} className="btn-primary shrink-0">
          Nouvelle partie
        </Link>
      </div>

      <div className="flex flex-col gap-3">
        {(matches ?? []).map((match) => {
          const players = (match.match_players ?? []) as MatchPlayerRow[];
          const totalPoints = players.reduce(
            (sum, mp) => sum + (mp.final_score ?? 0),
            0,
          );
          const winners = players.filter((mp) => mp.is_winner);
          const qwirkleCount = countQwirkles((match.rounds ?? []) as RoundRow[]);

          return (
            <Link
              key={match.id}
              href={`/matches/${match.id}`}
              className="card flex flex-col gap-1"
            >
              <div className="flex items-center justify-between">
                <span className="font-fredoka text-base font-semibold text-onjoo-green-900">
                  {game.name}
                </span>
                <span
                  className="font-quicksand text-xs font-semibold"
                  style={{
                    color: match.status === "completed" ? "#163D2E" : "#E9A23B",
                  }}
                >
                  {match.status === "completed" ? "Terminée" : "En cours"}
                </span>
              </div>
              <p className="font-quicksand text-sm text-[#777]">
                {players.map(participantName).filter(Boolean).join(", ")}
              </p>
              {match.status === "completed" && (
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="badge">
                    Gagnant{winners.length > 1 ? "s" : ""} :{" "}
                    {winners.map(participantName).filter(Boolean).join(", ")}
                  </span>
                  <span className="font-quicksand text-xs text-[#777]">
                    Total partie : {totalPoints}
                  </span>
                  {qwirkleCount > 0 && (
                    <span className="font-quicksand text-xs text-[#777]">
                      · {qwirkleCount} Qwirkle{qwirkleCount > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              )}
            </Link>
          );
        })}
        {(matches ?? []).length === 0 && (
          <p className="font-quicksand text-neutral-500">
            Aucune partie enregistrée pour l&apos;instant.
          </p>
        )}
      </div>
    </main>
  );
}
