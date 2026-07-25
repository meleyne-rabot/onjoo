import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveLeague } from "@/lib/league";

type MatchPlayerRow = {
  final_score: number | null;
  is_winner: boolean;
  players: { name: string } | { name: string }[] | null;
};

function playerName(row: MatchPlayerRow): string | undefined {
  return Array.isArray(row.players) ? row.players[0]?.name : row.players?.name;
}

export default async function MatchesPage() {
  const league = await getActiveLeague();
  if (!league) redirect("/leagues/new");

  const supabase = await createClient();
  const { data: matches } = await supabase
    .from("matches")
    .select(
      "id, game_code, status, played_at, created_at, match_players(final_score, is_winner, players(name))",
    )
    .eq("league_id", league.id)
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Historique</h1>
        <Link
          href="/matches/new"
          className="rounded-lg bg-neutral-900 px-3 py-2 text-sm text-white"
        >
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

          return (
            <Link
              key={match.id}
              href={`/matches/${match.id}`}
              className="flex flex-col gap-1 rounded-xl border border-neutral-200 px-4 py-3"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium capitalize">{match.game_code}</span>
                <span
                  className={`text-xs ${
                    match.status === "completed"
                      ? "text-emerald-600"
                      : "text-amber-600"
                  }`}
                >
                  {match.status === "completed" ? "Terminée" : "En cours"}
                </span>
              </div>
              <p className="text-sm text-neutral-500">
                {players.map(playerName).filter(Boolean).join(", ")}
              </p>
              {match.status === "completed" && (
                <p className="text-sm text-neutral-600">
                  Gagnant{winners.length > 1 ? "s" : ""} :{" "}
                  {winners.map(playerName).filter(Boolean).join(", ")} · Total
                  partie : {totalPoints}
                </p>
              )}
            </Link>
          );
        })}
        {(matches ?? []).length === 0 && (
          <p className="text-neutral-500">
            Aucune partie enregistrée pour l&apos;instant.
          </p>
        )}
      </div>
    </main>
  );
}
