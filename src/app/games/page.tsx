import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveLeague, getMyRole } from "@/lib/league";
import { getMyPlayer } from "@/lib/player";
import { gameMeta } from "@/lib/games/meta";
import { GameIcon } from "@/components/GameIcon";
import { GameRoulette } from "@/components/GameRoulette";

export default async function GamesPage() {
  const league = await getActiveLeague();
  if (!league) redirect("/leagues/new");

  const supabase = await createClient();

  // Les 3 requêtes sont indépendantes une fois la ligue connue : en
  // parallèle plutôt qu'en série, et un seul aller-retour pour les
  // compteurs de parties (par game_code) plutôt qu'une requête par jeu.
  const [myPlayer, myRole, gamesResult, matchesResult] = await Promise.all([
    getMyPlayer(league.id),
    getMyRole(league.id),
    supabase
      .from("games")
      .select("code, name, active, logo_url")
      .order("active", { ascending: false })
      .order("name", { ascending: true }),
    supabase.from("matches").select("game_code, status").eq("league_id", league.id),
  ]);

  // Un observateur (accès support) n'a jamais de fiche joueur — on ne le
  // force pas à en créer une juste pour regarder.
  if (!myPlayer && myRole !== "observer") redirect("/players/setup");

  const matchCounts = new Map<string, number>();
  const inProgressCodes = new Set<string>();
  for (const match of matchesResult.data ?? []) {
    matchCounts.set(match.game_code, (matchCounts.get(match.game_code) ?? 0) + 1);
    if (match.status === "in_progress") inProgressCodes.add(match.game_code);
  }

  // Le plus joué dans CETTE ligue en premier — une ligue qui ne joue qu'à
  // un seul jeu doit le voir en tête, pas classé alphabétiquement au milieu.
  const gamesWithCounts = (gamesResult.data ?? [])
    .map((game) => ({
      ...game,
      count: matchCounts.get(game.code) ?? 0,
    }))
    .sort((a, b) => {
      if (a.active !== b.active) return a.active ? -1 : 1;
      if (a.active && b.count !== a.count) return b.count - a.count;
      return a.name.localeCompare(b.name);
    });

  const activeGames = gamesWithCounts.filter((game) => game.active);
  const comingSoonGames = gamesWithCounts.filter((game) => !game.active);
  // Une partie en cours doit sauter aux yeux tout en haut, avant même le
  // tri par popularité — on ne veut pas la faire chercher plus bas.
  const inProgressGames = activeGames.filter((game) => inProgressCodes.has(game.code));
  const otherActiveGames = activeGames.filter((game) => !inProgressCodes.has(game.code));

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

      <GameRoulette games={activeGames.map((game) => ({ code: game.code, name: game.name }))} />

      {inProgressGames.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="font-quicksand text-xs font-semibold uppercase tracking-wide text-onjoo-green-900">
            Parties en cours
          </p>
          {inProgressGames.map((game) => {
            const meta = gameMeta(game.code);
            return (
              <Link
                key={game.code}
                href={`/games/${game.code}`}
                className="card flex items-center gap-4"
                style={{ borderColor: "#163D2E", borderWidth: 2 }}
              >
                <GameIcon category={meta.category} />
                <div className="flex flex-1 flex-col gap-0.5">
                  <span className="font-fredoka text-base font-semibold text-onjoo-green-900">
                    {game.name}
                  </span>
                  <span className="flex items-center gap-1.5 font-quicksand text-sm font-semibold text-onjoo-green-900">
                    <span className="h-1.5 w-1.5 rounded-full bg-onjoo-sage-500" />
                    Partie en cours — reprendre
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
              </Link>
            );
          })}
        </div>
      )}

      <div className="flex flex-col gap-3">
        {otherActiveGames.map((game) => {
          const meta = gameMeta(game.code);
          return (
            <Link
              key={game.code}
              href={`/games/${game.code}`}
              className="card flex items-center gap-4"
            >
              <GameIcon category={meta.category} />
              <div className="flex flex-1 flex-col gap-0.5">
                <span className="font-fredoka text-base font-semibold text-onjoo-green-900">
                  {game.name}
                </span>
                <span className="font-quicksand text-sm text-[#777]">
                  {`${game.count} partie${game.count > 1 ? "s" : ""} jouée${game.count > 1 ? "s" : ""}`}
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
            </Link>
          );
        })}
        {activeGames.length === 0 && (
          <p className="font-quicksand text-neutral-500">
            Aucun jeu pour l&apos;instant.
          </p>
        )}
      </div>

      {comingSoonGames.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="font-quicksand text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Bientôt disponible
          </p>
          {comingSoonGames.map((game) => {
            const meta = gameMeta(game.code);
            return (
              <div
                key={game.code}
                className="card flex cursor-not-allowed items-center gap-4 opacity-50"
              >
                <GameIcon category={meta.category} />
                <div className="flex flex-1 flex-col gap-0.5">
                  <span className="font-fredoka text-base font-semibold text-[#999]">
                    {game.name}
                  </span>
                  <span className="font-quicksand text-sm text-[#777]">
                    Bientôt disponible
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
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
