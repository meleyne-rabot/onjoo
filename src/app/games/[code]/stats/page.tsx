import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveLeague } from "@/lib/league";
import { gameMeta } from "@/lib/games/meta";
import { GameIcon } from "@/components/GameIcon";
import { AvatarBadge } from "@/components/AvatarBadge";

type PlayerJoin = { name: string; avatar_color: string; avatar_shape: string };
type MatchPlayerRow = {
  final_score: number | null;
  is_winner: boolean;
  player_id: string | null;
  guest_name: string | null;
  players: PlayerJoin | PlayerJoin[] | null;
};
type RoundRow = { points: number; detail: { qwirkle?: boolean } | null };
type MatchRow = { id: string; match_players: MatchPlayerRow[] | null; rounds: RoundRow[] | null };

function playerOf(mp: MatchPlayerRow): PlayerJoin | null {
  return Array.isArray(mp.players) ? (mp.players[0] ?? null) : mp.players;
}

function participantName(mp: MatchPlayerRow): string {
  return mp.guest_name ?? playerOf(mp)?.name ?? "?";
}

// Un score >= 12 est un signe quasi certain de Qwirkle (cf. section 4 du
// spec), sauf confirmation/infirmation explicite via le toggle Qwirkle.
function countQwirkles(rounds: RoundRow[]): number {
  return rounds.filter((r) => {
    const explicit = r.detail?.qwirkle;
    return explicit === true || (explicit === undefined && r.points >= 12);
  }).length;
}

function HeadToHeadDonut({
  playerA,
  playerB,
  totalGames,
}: {
  playerA: { name: string; avatarColor: string; avatarShape: string; wins: number };
  playerB: { name: string; avatarColor: string; avatarShape: string; wins: number };
  totalGames: number;
}) {
  const size = 120;
  const strokeWidth = 14;
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const lenA = totalGames > 0 ? (playerA.wins / totalGames) * circumference : 0;
  const lenB = circumference - lenA;
  const pctA = totalGames > 0 ? Math.round((playerA.wins / totalGames) * 100) : 0;

  return (
    <div className="card flex flex-col items-center gap-3 py-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eee" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={playerA.avatarColor}
          strokeWidth={strokeWidth}
          strokeDasharray={`${lenA} ${circumference - lenA}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={playerB.avatarColor}
          strokeWidth={strokeWidth}
          strokeDasharray={`${lenB} ${circumference - lenB}`}
          strokeDashoffset={-lenA}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <text
          x={size / 2}
          y={size / 2 - 2}
          textAnchor="middle"
          fontFamily="Fredoka"
          fontSize="22"
          fontWeight="700"
          fill="#163D2E"
        >
          {pctA}%
        </text>
        <text x={size / 2} y={size / 2 + 16} textAnchor="middle" fontFamily="Quicksand" fontSize="11" fill="#777">
          {playerA.wins}-{playerB.wins}
        </text>
      </svg>
      <div className="flex items-center gap-4">
        <div className="flex flex-col items-center gap-1">
          <AvatarBadge color={playerA.avatarColor} shape={playerA.avatarShape} size={28} />
          <span className="font-quicksand text-xs font-semibold text-onjoo-green-900">{playerA.name}</span>
        </div>
        <span className="font-quicksand text-xs text-[#999]">vs</span>
        <div className="flex flex-col items-center gap-1">
          <AvatarBadge color={playerB.avatarColor} shape={playerB.avatarShape} size={28} />
          <span className="font-quicksand text-xs font-semibold text-onjoo-green-900">{playerB.name}</span>
        </div>
      </div>
    </div>
  );
}

export default async function GameStatsPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const league = await getActiveLeague();
  if (!league) redirect("/leagues/new");

  const supabase = await createClient();
  const { data: game } = await supabase.from("games").select("code, name").eq("code", code).maybeSingle();
  if (!game) notFound();

  const { data: matches } = await supabase
    .from("matches")
    .select(
      "id, match_players(final_score, is_winner, player_id, guest_name, players(name, avatar_color, avatar_shape)), rounds(points, detail)",
    )
    .eq("league_id", league.id)
    .eq("game_code", code)
    .eq("status", "completed")
    .returns<MatchRow[]>();

  const rows = matches ?? [];
  const meta = gameMeta(code);

  const matchSummaries = rows.map((m) => {
    const players = m.match_players ?? [];
    return {
      id: m.id,
      total: players.reduce((sum, mp) => sum + (mp.final_score ?? 0), 0),
      qwirkles: code === "qwirkle" ? countQwirkles(m.rounds ?? []) : 0,
      names: players.map(participantName).join(", "),
    };
  });

  const topByTotal = [...matchSummaries].sort((a, b) => b.total - a.total).slice(0, 5);
  const topByQwirkles =
    code === "qwirkle" ? [...matchSummaries].sort((a, b) => b.qwirkles - a.qwirkles).slice(0, 5) : [];

  type LeaderRow = {
    playerId: string;
    name: string;
    avatarColor: string;
    avatarShape: string;
    wins: number;
    played: number;
    totalScore: number;
  };
  const leaderMap = new Map<string, LeaderRow>();
  for (const m of rows) {
    for (const mp of m.match_players ?? []) {
      // Joueur ponctuel (pas de fiche) : pas d'identité à suivre dans un classement.
      if (!mp.player_id) continue;
      const player = playerOf(mp);
      if (!player) continue;
      const existing = leaderMap.get(mp.player_id) ?? {
        playerId: mp.player_id,
        name: player.name,
        avatarColor: player.avatar_color,
        avatarShape: player.avatar_shape,
        wins: 0,
        played: 0,
        totalScore: 0,
      };
      existing.played += 1;
      existing.wins += mp.is_winner ? 1 : 0;
      existing.totalScore += mp.final_score ?? 0;
      leaderMap.set(mp.player_id, existing);
    }
  }
  const leaderboard = [...leaderMap.values()].sort((a, b) => b.wins - a.wins || b.played - a.played);

  type HeadToHead = {
    key: string;
    playerA: { playerId: string; name: string; avatarColor: string; avatarShape: string; wins: number };
    playerB: { playerId: string; name: string; avatarColor: string; avatarShape: string; wins: number };
    totalGames: number;
  };
  const h2hMap = new Map<string, HeadToHead>();
  for (const m of rows) {
    // Face-à-face = exactement 2 identités connues dans la partie (pas de
    // sens à désigner "qui a battu qui" à 3+ joueurs simultanés).
    const players = (m.match_players ?? []).filter((mp) => mp.player_id && playerOf(mp));
    if (players.length !== 2) continue;
    const [p1, p2] = players;
    const [first, second] = p1.player_id! < p2.player_id! ? [p1, p2] : [p2, p1];
    const firstPlayer = playerOf(first)!;
    const secondPlayer = playerOf(second)!;
    const key = `${first.player_id}-${second.player_id}`;
    const existing = h2hMap.get(key) ?? {
      key,
      playerA: {
        playerId: first.player_id!,
        name: firstPlayer.name,
        avatarColor: firstPlayer.avatar_color,
        avatarShape: firstPlayer.avatar_shape,
        wins: 0,
      },
      playerB: {
        playerId: second.player_id!,
        name: secondPlayer.name,
        avatarColor: secondPlayer.avatar_color,
        avatarShape: secondPlayer.avatar_shape,
        wins: 0,
      },
      totalGames: 0,
    };
    existing.totalGames += 1;
    if (first.is_winner) existing.playerA.wins += 1;
    if (second.is_winner) existing.playerB.wins += 1;
    h2hMap.set(key, existing);
  }
  const headToHeads = [...h2hMap.values()].sort((a, b) => b.totalGames - a.totalGames);

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col gap-8 px-6 py-10">
      <div className="flex items-center gap-3">
        <GameIcon category={meta.category} />
        <div className="flex flex-col gap-1">
          <Link href={`/games/${code}`} className="font-quicksand text-sm text-[#777]">
            ← {game.name}
          </Link>
          <h1 className="font-fredoka text-2xl font-bold text-onjoo-green-900">Stats</h1>
        </div>
      </div>

      {matchSummaries.length === 0 && (
        <p className="font-quicksand text-neutral-500">Pas encore de partie terminée.</p>
      )}

      {leaderboard.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-fredoka text-lg font-bold text-onjoo-green-900">Classement</h2>
          <div className="flex flex-col gap-2">
            {leaderboard.map((p, i) => (
              <div key={p.playerId} className="card flex items-center gap-3 py-3">
                <span className="w-6 text-center font-fredoka text-base font-bold text-[#999]">
                  {i + 1}
                </span>
                <AvatarBadge color={p.avatarColor} shape={p.avatarShape} size={36} />
                <div className="flex flex-1 flex-col">
                  <span className="font-quicksand text-base font-medium text-onjoo-green-900">
                    {p.name}
                  </span>
                  <span className="font-quicksand text-xs text-[#777]">
                    {p.played} partie{p.played > 1 ? "s" : ""} ·{" "}
                    {Math.round((p.wins / p.played) * 100)}% de victoires ·{" "}
                    {Math.round(p.totalScore / p.played)} pts en moyenne
                  </span>
                </div>
                <span className="badge">{p.wins} 🏆</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {headToHeads.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-fredoka text-lg font-bold text-onjoo-green-900">Face à face</h2>
          <div className="flex flex-wrap justify-center gap-3">
            {headToHeads.map((h2h) => (
              <HeadToHeadDonut
                key={h2h.key}
                playerA={h2h.playerA}
                playerB={h2h.playerB}
                totalGames={h2h.totalGames}
              />
            ))}
          </div>
        </section>
      )}

      {topByTotal.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-fredoka text-lg font-bold text-onjoo-green-900">
            Top parties (score total)
          </h2>
          <div className="flex flex-col gap-2">
            {topByTotal.map((m, i) => (
              <Link key={m.id} href={`/matches/${m.id}`} className="card flex items-center gap-3 py-2.5">
                <span className="w-6 text-center font-fredoka text-sm font-bold text-[#999]">
                  {i + 1}
                </span>
                <span className="flex-1 font-quicksand text-sm text-onjoo-green-900">{m.names}</span>
                <span className="badge">{m.total} pts</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {topByQwirkles.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-fredoka text-lg font-bold text-onjoo-green-900">
            Top parties (Qwirkles)
          </h2>
          <div className="flex flex-col gap-2">
            {topByQwirkles.map((m, i) => (
              <Link key={m.id} href={`/matches/${m.id}`} className="card flex items-center gap-3 py-2.5">
                <span className="w-6 text-center font-fredoka text-sm font-bold text-[#999]">
                  {i + 1}
                </span>
                <span className="flex-1 font-quicksand text-sm text-onjoo-green-900">{m.names}</span>
                <span className="badge">
                  {m.qwirkles} Qwirkle{m.qwirkles > 1 ? "s" : ""}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
