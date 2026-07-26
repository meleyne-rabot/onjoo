import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveLeague } from "@/lib/league";
import { gameMeta } from "@/lib/games/meta";

export default async function GamesPage() {
  const league = await getActiveLeague();
  if (!league) redirect("/leagues/new");

  const supabase = await createClient();
  const { data: games } = await supabase
    .from("games")
    .select("code, name")
    .eq("active", true)
    .order("name", { ascending: true });

  const gamesWithCounts = await Promise.all(
    (games ?? []).map(async (game) => {
      const { count } = await supabase
        .from("matches")
        .select("id", { count: "exact", head: true })
        .eq("league_id", league.id)
        .eq("game_code", game.code);
      return { ...game, count: count ?? 0 };
    }),
  );

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
          return (
            <Link
              key={game.code}
              href={`/games/${game.code}`}
              className="card flex items-center gap-4"
            >
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl font-fredoka text-xl font-bold text-white"
                style={{ background: meta.accent }}
              >
                {meta.label.charAt(0)}
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="font-fredoka text-base font-semibold text-onjoo-green-900">
                  {game.name}
                </span>
                <span className="font-quicksand text-sm text-[#777]">
                  {game.count} partie{game.count > 1 ? "s" : ""} jouée
                  {game.count > 1 ? "s" : ""}
                </span>
              </div>
            </Link>
          );
        })}
        {gamesWithCounts.length === 0 && (
          <p className="font-quicksand text-neutral-500">
            Aucun jeu actif pour l&apos;instant.
          </p>
        )}
      </div>
    </main>
  );
}
