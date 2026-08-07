import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveLeague, getMyRole } from "@/lib/league";
import { getMyPlayer } from "@/lib/player";
import { gameMeta } from "@/lib/games/meta";
import { CATEGORY_ORDER, CATEGORY_LABELS } from "@/lib/games/categories";
import { GameIcon, type GameCategory } from "@/components/GameIcon";
import { GameRoulette } from "@/components/GameRoulette";
import { disableGameForLeague, enableGameForLeague } from "./actions";

// Nombre max de jeux dans "Joué récemment" — au-delà, la section perd son
// intérêt (autant aller voir la bonne catégorie directement).
const RECENT_LIMIT = 4;

type GameRow = {
  code: string;
  name: string;
  active: boolean;
  logo_url: string | null;
  count: number;
};

// Petit switch vert/gris (façon iOS) plutôt qu'un gros bouton texte — reste
// un <form>/<button> en dehors du <Link> (voir GameCard) pour ne jamais
// imbriquer un élément interactif dans un <a>.
function GameToggleSwitch({
  game,
  action,
  on,
}: {
  game: GameRow;
  action: (formData: FormData) => void;
  on: boolean;
}) {
  return (
    <form action={action} className="shrink-0">
      <input type="hidden" name="game_code" value={game.code} />
      <button
        type="submit"
        aria-label={on ? `Désactiver ${game.name}` : `Réactiver ${game.name}`}
        className="relative h-6 w-11 shrink-0 rounded-full transition-colors"
        style={{ backgroundColor: on ? "#8A9A6E" : "#ddd" }}
      >
        <span
          className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-[left]"
          style={{ left: on ? 22 : 2 }}
        />
      </button>
    </form>
  );
}

function GameCard({
  game,
  href,
  subtitle,
  highlighted,
  disabled,
  toggle,
}: {
  game: GameRow;
  href?: string;
  subtitle: React.ReactNode;
  highlighted?: boolean;
  disabled?: boolean;
  toggle?: React.ReactNode;
}) {
  const meta = gameMeta(game.code);
  const inner = (
    <>
      <GameIcon category={meta.category} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span
          className={`font-fredoka text-base font-semibold ${disabled ? "text-[#999]" : "text-onjoo-green-900"}`}
        >
          {game.name}
        </span>
        {subtitle}
      </div>
    </>
  );

  const clickable = !disabled && href;

  return (
    <div
      className={`card flex items-center gap-4 ${disabled ? "opacity-50" : ""}`}
      style={highlighted ? { borderColor: "#163D2E", borderWidth: 2 } : undefined}
    >
      {clickable ? (
        <Link href={href} className="flex min-w-0 flex-1 items-center gap-4">
          {inner}
        </Link>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-4">{inner}</div>
      )}
      {(game.logo_url || toggle) && (
        <div className="flex shrink-0 flex-col items-center gap-1.5">
          {game.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element -- logos externes/uploadés, domaines non connus à l'avance
            <img
              src={game.logo_url}
              alt=""
              className="h-11 w-[72px] rounded-[10px] bg-[#FAF1DE] object-contain p-1"
            />
          )}
          {toggle}
        </div>
      )}
    </div>
  );
}

export default async function GamesPage() {
  const league = await getActiveLeague();
  if (!league) redirect("/leagues/new");

  const supabase = await createClient();

  // Les requêtes sont indépendantes une fois la ligue connue : en parallèle
  // plutôt qu'en série, et un seul aller-retour pour les compteurs de
  // parties (par game_code) plutôt qu'une requête par jeu.
  const [myPlayer, myRole, gamesResult, matchesResult, disabledResult] = await Promise.all([
    getMyPlayer(league.id),
    getMyRole(league.id),
    supabase
      .from("games")
      .select("code, name, active, logo_url")
      .order("active", { ascending: false })
      .order("name", { ascending: true }),
    supabase.from("matches").select("game_code, status, created_at").eq("league_id", league.id),
    supabase.from("league_games_disabled").select("game_code").eq("league_id", league.id),
  ]);

  // Un observateur (accès support) n'a jamais de fiche joueur — on ne le
  // force pas à en créer une juste pour regarder.
  if (!myPlayer && myRole !== "observer") redirect("/players/setup");

  const matchCounts = new Map<string, number>();
  const inProgressCodes = new Set<string>();
  const lastPlayedAt = new Map<string, string>();
  for (const match of matchesResult.data ?? []) {
    matchCounts.set(match.game_code, (matchCounts.get(match.game_code) ?? 0) + 1);
    if (match.status === "in_progress") inProgressCodes.add(match.game_code);
    const previous = lastPlayedAt.get(match.game_code);
    if (!previous || match.created_at > previous) lastPlayedAt.set(match.game_code, match.created_at);
  }

  const disabledCodes = new Set((disabledResult.data ?? []).map((row) => row.game_code));

  // Le plus joué dans CETTE ligue en premier — une ligue qui ne joue qu'à
  // un seul jeu doit le voir en tête, pas classé alphabétiquement au milieu.
  const gamesWithCounts: GameRow[] = (gamesResult.data ?? [])
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
  // Un jeu désactivé par la ligue disparaît de la découverte (récent,
  // catégories, roulette) mais jamais d'une partie déjà en cours — on ne
  // veut pas bloquer une partie qu'on est en train de finir.
  const inProgressGames = activeGames.filter((game) => inProgressCodes.has(game.code));
  const visibleActiveGames = activeGames.filter((game) => !disabledCodes.has(game.code));
  const leagueDisabledGames = activeGames.filter((game) => disabledCodes.has(game.code));

  // "Joué récemment" : un raccourci vers ce qu'on a l'habitude de sortir,
  // distinct du tri par popularité — une partie jouée hier doit remonter
  // même si ce n'est pas historiquement le jeu le plus joué de la ligue.
  const recentGames = visibleActiveGames
    .filter((game) => !inProgressCodes.has(game.code) && lastPlayedAt.has(game.code))
    .sort((a, b) => (lastPlayedAt.get(b.code) ?? "").localeCompare(lastPlayedAt.get(a.code) ?? ""))
    .slice(0, RECENT_LIMIT);

  // Tout le reste (actifs pas encore joués récemment + à venir) rangé par
  // catégorie plutôt qu'en deux longues listes plates — avec une dizaine
  // de jeux, dont des "bientôt disponible" mélangés, on ne retrouvait plus
  // rien.
  const shownCodes = new Set([...inProgressGames, ...recentGames].map((g) => g.code));
  const byCategory = new Map<GameCategory, GameRow[]>();
  for (const category of CATEGORY_ORDER) byCategory.set(category, []);
  for (const game of gamesWithCounts) {
    if (shownCodes.has(game.code) || disabledCodes.has(game.code)) continue;
    byCategory.get(gameMeta(game.code).category)?.push(game);
  }

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

      <GameRoulette
        games={visibleActiveGames.map((game) => ({
          code: game.code,
          name: game.name,
          category: gameMeta(game.code).category,
        }))}
      />

      {inProgressGames.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="font-quicksand text-xs font-semibold uppercase tracking-wide text-onjoo-green-900">
            Parties en cours
          </p>
          {inProgressGames.map((game) => (
            <GameCard
              key={game.code}
              game={game}
              href={`/games/${game.code}`}
              highlighted
              subtitle={
                <span className="flex items-center gap-1.5 font-quicksand text-sm font-semibold text-onjoo-green-900">
                  <span className="h-1.5 w-1.5 rounded-full bg-onjoo-sage-500" />
                  Partie en cours — reprendre
                </span>
              }
            />
          ))}
        </div>
      )}

      {recentGames.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="font-quicksand text-xs font-semibold uppercase tracking-wide text-onjoo-green-900">
            Joué récemment
          </p>
          {recentGames.map((game) => (
            <GameCard
              key={game.code}
              game={game}
              href={`/games/${game.code}`}
              subtitle={
                <span className="font-quicksand text-sm text-[#777]">
                  {`${game.count} partie${game.count > 1 ? "s" : ""} jouée${game.count > 1 ? "s" : ""}`}
                </span>
              }
            />
          ))}
        </div>
      )}

      {activeGames.length === 0 && (
        <p className="font-quicksand text-neutral-500">Aucun jeu pour l&apos;instant.</p>
      )}

      {CATEGORY_ORDER.map((category) => {
        const games = byCategory.get(category) ?? [];
        if (games.length === 0) return null;
        return (
          <div key={category} className="flex flex-col gap-3">
            <p className="font-quicksand text-xs font-semibold uppercase tracking-wide text-neutral-400">
              {CATEGORY_LABELS[category]}
            </p>
            {games.map((game) =>
              game.active ? (
                <GameCard
                  key={game.code}
                  game={game}
                  href={`/games/${game.code}`}
                  subtitle={
                    <span className="font-quicksand text-sm text-[#777]">
                      {`${game.count} partie${game.count > 1 ? "s" : ""} jouée${game.count > 1 ? "s" : ""}`}
                    </span>
                  }
                  toggle={<GameToggleSwitch game={game} action={disableGameForLeague} on />}
                />
              ) : (
                <GameCard
                  key={game.code}
                  game={game}
                  disabled
                  subtitle={
                    <span className="font-quicksand text-sm text-[#777]">Bientôt disponible</span>
                  }
                />
              ),
            )}
          </div>
        );
      })}

      {leagueDisabledGames.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="font-quicksand text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Jeux inactifs pour {league.name}
          </p>
          {leagueDisabledGames.map((game) => (
            <GameCard
              key={game.code}
              game={game}
              disabled
              subtitle={<span className="font-quicksand text-sm text-[#777]">Désactivé pour cette ligue</span>}
              toggle={<GameToggleSwitch game={game} action={enableGameForLeague} on={false} />}
            />
          ))}
        </div>
      )}
    </main>
  );
}
