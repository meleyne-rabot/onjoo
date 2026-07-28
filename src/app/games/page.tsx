import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveLeague } from "@/lib/league";
import { getMyPlayer } from "@/lib/player";
import { gameMeta } from "@/lib/games/meta";
import { GameIcon } from "@/components/GameIcon";

export default async function GamesPage() {
  const league = await getActiveLeague();
  if (!league) redirect("/leagues/new");

  const supabase = await createClient();

  // Les 3 requêtes sont indépendantes une fois la ligue connue : en
  // parallèle plutôt qu'en série, et un seul aller-retour pour les
  // compteurs de parties (par game_code) plutôt qu'une requête par jeu.
  const [myPlayer, gamesResult, matchesResult] = await Promise.all([
    getMyPlayer(league.id),
    supabase
      .from("games")
      .select("code, name, active, logo_url")
      .order("active", { ascending: false })
      .order("name", { ascending: true }),
    supabase.from("matches").select("game_code").eq("league_id", league.id),
  ]);

  if (!myPlayer) redirect("/players/setup");

  const matchCounts = new Map<string, number>();
  for (const match of matchesResult.data ?? []) {
    matchCounts.set(match.game_code, (matchCounts.get(match.game_code) ?? 0) + 1);
  }

  const gamesWithCounts = (gamesResult.data ?? []).map((game) => ({
    ...game,
    count: matchCounts.get(game.code) ?? 0,
  }));

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col gap-6 px-6 py-10">
      <header>
        <p className="font-quicksand text-sm uppercase tracking-wide text-neutral-500">
          {league.name}
        </p>
        <h1 className="font-fredoka text-2xl font-bold text-onjoo-green-900">
          Nos jeux
        </h1>
      </header>

      <div className="flex flex-col gap-3">
        {gamesWithCounts.map((game) => {
          const meta = gameMeta(game.code);
          const tile = (
            <>
              <GameIcon category={meta.category} />
              <div className="flex flex-1 flex-col gap-0.5">
                <span
                  className="font-fredoka text-base font-semibold"
                  style={{ color: game.active ? "#163D2E" : "#999" }}
                >
                  {game.name}
                </span>
                <span className="font-quicksand text-sm text-[#777]">
                  {game.active
                    ? `${game.count} partie${game.count > 1 ? "s" : ""} jouée${game.count > 1 ? "s" : ""}`
                    : "Bientôt disponible"}
                </span>
              </div>
              {game.logo_url && (
                // eslint-disable-next-line @next/next/no-img-element -- logos externes/uploadés, domaines non connus à l'avance
                <img
                  src={game.logo_url}
                  alt=""
                  className="h-11 w-[72px] shrink-0 rounded-[10px] bg-[#FAF1DE] object-contain p-1"
                />
              )}
            </>
          );

          if (!game.active) {
            return (
              <div
                key={game.code}
                className="card flex cursor-not-allowed items-center gap-4 opacity-50"
              >
                {tile}
              </div>
            );
          }

          return (
            <Link
              key={game.code}
              href={`/games/${game.code}`}
              className="card flex items-center gap-4"
            >
              {tile}
            </Link>
          );
        })}
        {gamesWithCounts.length === 0 && (
          <p className="font-quicksand text-neutral-500">
            Aucun jeu pour l&apos;instant.
          </p>
        )}
      </div>
    </main>
  );
}
