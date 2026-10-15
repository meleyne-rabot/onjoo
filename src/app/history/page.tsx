import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveLeague } from "@/lib/league";
import { gameMeta } from "@/lib/games/meta";
import { GameIcon } from "@/components/GameIcon";
import { MatchDateBadge } from "@/components/MatchDateBadge";

type MatchPlayerRow = {
  final_score: number | null;
  is_winner: boolean;
  guest_name: string | null;
  players: { name: string } | { name: string }[] | null;
};

function participantName(row: MatchPlayerRow): string {
  if (row.guest_name) return row.guest_name;
  const player = Array.isArray(row.players) ? row.players[0] : row.players;
  return player?.name ?? "?";
}

// Les dates s'affichent à l'heure de Paris : le serveur tourne en UTC,
// une partie jouée tard le soir ne doit pas basculer au mois suivant.
function monthLabel(iso: string): string {
  const label = new Date(iso).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
    timeZone: "Europe/Paris",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ game?: string }>;
}) {
  const { game: gameFilter } = await searchParams;

  const league = await getActiveLeague();
  if (!league) redirect("/leagues/new");

  const supabase = await createClient();

  const [{ data: matches }, { data: games }] = await Promise.all([
    supabase
      .from("matches")
      .select(
        "id, game_code, status, played_at, created_at, match_players(final_score, is_winner, guest_name, players(name))",
      )
      .eq("league_id", league.id)
      .order("created_at", { ascending: false })
      .limit(500),
    supabase.from("games").select("code, name"),
  ]);

  const gameNames = new Map((games ?? []).map((g) => [g.code, g.name as string]));
  const gameName = (code: string) => gameNames.get(code) ?? gameMeta(code).label;

  // Date d'une partie = date de jeu (modifiable à la main), à défaut sa
  // date de création (parties en cours ou anciennes sans date).
  const dated = (matches ?? [])
    .map((match) => ({ match, date: match.played_at ?? match.created_at }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const playedGameCodes = [...new Set(dated.map(({ match }) => match.game_code))].sort(
    (a, b) => gameName(a).localeCompare(gameName(b), "fr"),
  );

  const visible = gameFilter
    ? dated.filter(({ match }) => match.game_code === gameFilter)
    : dated;

  const groups: { label: string; items: typeof visible }[] = [];
  for (const entry of visible) {
    const label = monthLabel(entry.date);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(entry);
    else groups.push({ label, items: [entry] });
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col gap-6 px-6 pb-28 pt-10">
      <div>
        <h1 className="font-fredoka text-2xl font-bold text-onjoo-green-900">
          Historique
        </h1>
        <p className="font-quicksand text-sm text-[#777]">
          {visible.length} partie{visible.length > 1 ? "s" : ""} · {league.name}
        </p>
      </div>

      {playedGameCodes.length > 1 && (
        <div className="-mx-6 flex gap-2 overflow-x-auto px-6 pb-1">
          <FilterChip href="/history" active={!gameFilter} label="Tous" />
          {playedGameCodes.map((code) => (
            <FilterChip
              key={code}
              href={`/history?game=${code}`}
              active={gameFilter === code}
              label={gameName(code)}
            />
          ))}
        </div>
      )}

      {groups.map((group) => (
        <section key={group.label} className="flex flex-col gap-3">
          <h2 className="font-fredoka text-base font-semibold text-onjoo-green-900">
            {group.label}
          </h2>
          {group.items.map(({ match, date }) => {
            const players = (match.match_players ?? []) as MatchPlayerRow[];
            const completed = match.status === "completed";
            // Gagnants d'abord, puis l'ordre naturel : le sens du classement
            // (plus haut / plus bas = mieux) dépend du jeu, on s'en remet à
            // is_winner plutôt que de retrier les scores.
            const ordered = [...players].sort(
              (a, b) => Number(b.is_winner) - Number(a.is_winner),
            );
            const meta = gameMeta(match.game_code);

            return (
              <Link
                key={match.id}
                href={`/matches/${match.id}`}
                className="card flex items-start gap-3"
              >
                <GameIcon category={meta.category} size={40} />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-fredoka text-base font-semibold text-onjoo-green-900">
                      {gameName(match.game_code)}
                    </span>
                    <span
                      className="shrink-0 font-quicksand text-xs font-semibold"
                      style={{ color: completed ? "#163D2E" : "#E9A23B" }}
                    >
                      {completed ? "Terminée" : "En cours"}
                    </span>
                  </div>
                  <MatchDateBadge matchId={match.id} playedAt={date} />
                  {completed ? (
                    <p className="font-quicksand text-sm text-[#777]">
                      {ordered.map((mp, index) => (
                        <span key={index}>
                          {index > 0 && " · "}
                          <span
                            className={
                              mp.is_winner ? "font-bold text-onjoo-green-900" : ""
                            }
                          >
                            {mp.is_winner && "🏆 "}
                            {participantName(mp)} {mp.final_score ?? 0}
                          </span>
                        </span>
                      ))}
                    </p>
                  ) : (
                    <p className="font-quicksand text-sm text-[#777]">
                      {players.map(participantName).join(", ")}
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </section>
      ))}

      {visible.length === 0 && (
        <p className="font-quicksand text-neutral-500">
          Aucune partie enregistrée pour l&apos;instant.
        </p>
      )}
    </main>
  );
}

function FilterChip({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={`shrink-0 rounded-full border px-3 py-1.5 font-quicksand text-xs font-semibold ${
        active
          ? "border-onjoo-green-900 bg-onjoo-green-900 text-white"
          : "border-[#eee] bg-white text-onjoo-green-900"
      }`}
    >
      {label}
    </Link>
  );
}
