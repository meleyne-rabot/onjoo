import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveLeague } from "@/lib/league";
import { gameMeta } from "@/lib/games/meta";
import { GameIcon } from "@/components/GameIcon";
import { AvatarBadge } from "@/components/AvatarBadge";

type PlayerJoin = { name: string; avatar_color: string; avatar_shape: string };
type MatchPlayerRow = {
  id: string;
  final_score: number | null;
  is_winner: boolean;
  player_id: string | null;
  guest_name: string | null;
  players: PlayerJoin | PlayerJoin[] | null;
};
type RoundRow = { match_player_id: string; points: number; detail: { qwirkle?: boolean } | null };
type MatchRow = { id: string; match_players: MatchPlayerRow[] | null; rounds: RoundRow[] | null };

function playerOf(mp: MatchPlayerRow): PlayerJoin | null {
  return Array.isArray(mp.players) ? (mp.players[0] ?? null) : mp.players;
}

function participantName(mp: MatchPlayerRow): string {
  return mp.guest_name ?? playerOf(mp)?.name ?? "?";
}

// Un score >= 12 est un signe quasi certain de Qwirkle (cf. section 4 du
// spec), sauf confirmation/infirmation explicite via le toggle Qwirkle.
function isQwirkleRound(r: RoundRow): boolean {
  const explicit = r.detail?.qwirkle;
  return explicit === true || (explicit === undefined && r.points >= 12);
}

type DonutPlayer = { name: string; avatarColor: string; avatarShape: string; wins: number };

// Position d'une étiquette au milieu d'un arc, sur l'anneau (le cercle
// démarre à midi, -90° dans le repère SVG standard où 0° pointe à droite).
function arcMidpoint(cx: number, cy: number, radius: number, startFraction: number, sweepFraction: number) {
  const midAngleDeg = (startFraction + sweepFraction / 2) * 360 - 90;
  const rad = (midAngleDeg * Math.PI) / 180;
  return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
}

function HeadToHeadDonut({
  playerA,
  playerB,
  totalGames,
}: {
  playerA: DonutPlayer;
  playerB: DonutPlayer;
  totalGames: number;
}) {
  const size = 280;
  const cx = size / 2;
  const strokeWidth = 20;
  const r = 85;
  const circumference = 2 * Math.PI * r;
  const fracA = totalGames > 0 ? playerA.wins / totalGames : 0;
  const fracB = 1 - fracA;
  // Dessinée en second, la fiche A finit du côté "gauche" du donut quand
  // les deux parts sont proches de 50/50 (le tracé démarre à midi et
  // avance dans le sens horaire : ce qui est tracé en premier occupe la
  // droite, ce qui est tracé en second occupe la gauche) — pour que la
  // couleur de la carte de gauche corresponde à l'arc de gauche.
  const lenB = fracB * circumference;
  const lenA = circumference - lenB;
  const pctA = Math.round(fracA * 100);
  const pctB = 100 - pctA;
  const labelRadius = r + strokeWidth / 2 + 18;
  const chipRadius = 18;
  const posB = arcMidpoint(cx, cx, labelRadius, 0, fracB);
  const posA = arcMidpoint(cx, cx, labelRadius, fracB, fracA);

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="#eee" strokeWidth={strokeWidth} />
        <circle
          cx={cx}
          cy={cx}
          r={r}
          fill="none"
          stroke={playerB.avatarColor}
          strokeWidth={strokeWidth}
          strokeDasharray={`${lenB} ${circumference - lenB}`}
          transform={`rotate(-90 ${cx} ${cx})`}
        />
        <circle
          cx={cx}
          cy={cx}
          r={r}
          fill="none"
          stroke={playerA.avatarColor}
          strokeWidth={strokeWidth}
          strokeDasharray={`${lenA} ${circumference - lenA}`}
          strokeDashoffset={-lenB}
          transform={`rotate(-90 ${cx} ${cx})`}
        />
        <text x={cx} y={cx - 6} textAnchor="middle" fontFamily="Fredoka" fontSize="20" fontWeight="700" fill="#163D2E">
          {playerA.wins}-{playerB.wins}
        </text>
        <text x={cx} y={cx + 14} textAnchor="middle" fontFamily="Quicksand" fontSize="11" fill="#999">
          victoires sur {totalGames} partie{totalGames > 1 ? "s" : ""}
        </text>
        {totalGames > 0 && (
          <>
            <circle cx={posA.x} cy={posA.y} r={chipRadius} fill={playerA.avatarColor} />
            <text
              x={posA.x}
              y={posA.y + 5}
              textAnchor="middle"
              fontFamily="Fredoka"
              fontSize="14"
              fontWeight="700"
              fill="#fff"
            >
              {pctA}%
            </text>
            <circle cx={posB.x} cy={posB.y} r={chipRadius} fill={playerB.avatarColor} />
            <text
              x={posB.x}
              y={posB.y + 5}
              textAnchor="middle"
              fontFamily="Fredoka"
              fontSize="14"
              fontWeight="700"
              fill="#fff"
            >
              {pctB}%
            </text>
          </>
        )}
      </svg>
    </div>
  );
}

type LeaderRow = {
  playerId: string;
  name: string;
  avatarColor: string;
  avatarShape: string;
  wins: number;
  played: number;
  totalScore: number;
  totalQwirkles: number;
};

// Le classement lui-même, en donut : une part par joueur, proportionnelle
// à sa part des victoires totales — marche pour n'importe quel nombre de
// joueurs (2 ou plus), contrairement au face-à-face qui est spécifiquement
// une comparaison à deux. Pour 2 joueurs précisément, le premier de la
// liste est dessiné en second (même trick que HeadToHeadDonut) pour finir
// à gauche, aligné avec sa carte de stats juste en dessous.
function LeaderboardDonut({ players, showQwirkles }: { players: LeaderRow[]; showQwirkles: boolean }) {
  const size = 280;
  const cx = size / 2;
  const strokeWidth = 20;
  const r = 85;
  const circumference = 2 * Math.PI * r;
  const labelRadius = r + strokeWidth / 2 + 18;
  const chipRadius = 18;
  const totalWins = players.reduce((sum, p) => sum + p.wins, 0);
  const drawOrder = players.length === 2 ? [players[1], players[0]] : players;

  const segments = drawOrder.reduce<
    { player: LeaderRow; len: number; offset: number; pct: number; pos: { x: number; y: number }; fraction: number; cumulativeEnd: number }[]
  >((acc, p) => {
    const cumulativeFraction = acc.length > 0 ? acc[acc.length - 1].cumulativeEnd : 0;
    const fraction = totalWins > 0 ? p.wins / totalWins : 1 / players.length;
    const len = fraction * circumference;
    const offset = -cumulativeFraction * circumference;
    const pos = arcMidpoint(cx, cx, labelRadius, cumulativeFraction, fraction);
    acc.push({ player: p, len, offset, pct: Math.round(fraction * 100), pos, fraction, cumulativeEnd: cumulativeFraction + fraction });
    return acc;
  }, []);

  return (
    <div className="card flex flex-col items-center gap-4 py-6">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="#eee" strokeWidth={strokeWidth} />
        {segments.map((s) => (
          <circle
            key={s.player.playerId}
            cx={cx}
            cy={cx}
            r={r}
            fill="none"
            stroke={s.player.avatarColor}
            strokeWidth={strokeWidth}
            strokeDasharray={`${s.len} ${circumference - s.len}`}
            strokeDashoffset={s.offset}
            transform={`rotate(-90 ${cx} ${cx})`}
          />
        ))}
        <text x={cx} y={cx + 4} textAnchor="middle" fontFamily="Quicksand" fontSize="11" fill="#999">
          répartition des victoires
        </text>
        {/* Sous ~6%, la part est trop fine pour porter une étiquette lisible sans chevaucher ses voisines. */}
        {segments
          .filter((s) => s.fraction >= 0.06)
          .map((s) => (
            <g key={`${s.player.playerId}-label`}>
              <circle cx={s.pos.x} cy={s.pos.y} r={chipRadius} fill={s.player.avatarColor} />
              <text
                x={s.pos.x}
                y={s.pos.y + 5}
                textAnchor="middle"
                fontFamily="Fredoka"
                fontSize="14"
                fontWeight="700"
                fill="#fff"
              >
                {s.pct}%
              </text>
            </g>
          ))}
      </svg>
      <div className="grid w-full grid-cols-2 gap-3">
        {players.map((p) => (
          <div key={p.playerId} className="flex flex-col items-center gap-1 text-center">
            <AvatarBadge color={p.avatarColor} shape={p.avatarShape} size={40} />
            <span className="font-quicksand text-sm font-semibold text-onjoo-green-900">{p.name}</span>
            <span className="font-quicksand text-xs text-[#777]">
              {p.wins} 🏆 · {p.played} partie{p.played > 1 ? "s" : ""}
            </span>
            <span className="font-quicksand text-xs text-[#777]">
              {Math.round(p.totalScore / p.played)} pts en moyenne
            </span>
            {showQwirkles && (
              <span className="font-quicksand text-xs text-[#777]">{p.totalQwirkles} Qwirkles au total</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function PlayerFilterPills({
  code,
  players,
  selected,
}: {
  code: string;
  players: { playerId: string; name: string }[];
  selected?: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href={`/games/${code}/stats`}
        className={`rounded-full border-2 px-3 py-1 font-quicksand text-xs font-bold ${
          !selected ? "border-onjoo-green-900 text-onjoo-green-900" : "border-[#ddd] text-[#999]"
        }`}
      >
        Tous
      </Link>
      {players.map((p) => (
        <Link
          key={p.playerId}
          href={`/games/${code}/stats?player=${p.playerId}`}
          className={`rounded-full border-2 px-3 py-1 font-quicksand text-xs font-bold ${
            selected === p.playerId ? "border-onjoo-green-900 text-onjoo-green-900" : "border-[#ddd] text-[#999]"
          }`}
        >
          {p.name}
        </Link>
      ))}
    </div>
  );
}

export default async function GameStatsPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ player?: string }>;
}) {
  const { code } = await params;
  const { player: selectedPlayerId } = await searchParams;
  const league = await getActiveLeague();
  if (!league) redirect("/leagues/new");

  const supabase = await createClient();
  const { data: game } = await supabase.from("games").select("code, name").eq("code", code).maybeSingle();
  if (!game) notFound();

  const { data: matches } = await supabase
    .from("matches")
    .select(
      "id, match_players(id, final_score, is_winner, player_id, guest_name, players(name, avatar_color, avatar_shape)), rounds(match_player_id, points, detail)",
    )
    .eq("league_id", league.id)
    .eq("game_code", code)
    .eq("status", "completed")
    .returns<MatchRow[]>();

  const rows = matches ?? [];
  const meta = gameMeta(code);
  const isQwirkle = code === "qwirkle";

  // Qwirkles par match_player_id, pour les attribuer ensuite au bon
  // joueur (une manche référence match_player_id, pas player_id).
  const qwirklesByMatchPlayer = new Map<string, number>();
  if (isQwirkle) {
    for (const m of rows) {
      for (const r of m.rounds ?? []) {
        if (isQwirkleRound(r)) {
          qwirklesByMatchPlayer.set(r.match_player_id, (qwirklesByMatchPlayer.get(r.match_player_id) ?? 0) + 1);
        }
      }
    }
  }

  const matchSummaries = rows.map((m) => {
    const players = m.match_players ?? [];
    const qwirkles = isQwirkle
      ? players.reduce((sum, mp) => sum + (qwirklesByMatchPlayer.get(mp.id) ?? 0), 0)
      : 0;
    return {
      id: m.id,
      total: players.reduce((sum, mp) => sum + (mp.final_score ?? 0), 0),
      qwirkles,
      names: players.map(participantName).join(", "),
      playerIds: players.map((mp) => mp.player_id).filter((id): id is string => Boolean(id)),
    };
  });

  const leaderMap = new Map<string, LeaderRow>();
  const personalScores: { playerId: string; matchId: string; score: number }[] = [];
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
        totalQwirkles: 0,
      };
      existing.played += 1;
      existing.wins += mp.is_winner ? 1 : 0;
      existing.totalScore += mp.final_score ?? 0;
      existing.totalQwirkles += qwirklesByMatchPlayer.get(mp.id) ?? 0;
      leaderMap.set(mp.player_id, existing);
      personalScores.push({ playerId: mp.player_id, matchId: m.id, score: mp.final_score ?? 0 });
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

  // Si la ligue n'a que ces 2 joueurs, leur unique face-à-face EST déjà le
  // classement ci-dessus (mêmes chiffres) — l'afficher une seconde fois
  // n'apporte rien. Dès 3 joueurs, chaque face-à-face n'est qu'un sous-
  // ensemble du classement global : il apporte une vraie info en plus.
  const showHeadToHeads = !(leaderboard.length === 2 && headToHeads.length === 1);

  // Filtre partagé par les 3 tops ci-dessous, via ?player=<id> (liens,
  // pas de JS client nécessaire — cohérent avec le reste, tout en server).
  const filteredMatches = selectedPlayerId
    ? matchSummaries.filter((m) => m.playerIds.includes(selectedPlayerId))
    : matchSummaries;
  const topByTotal = [...filteredMatches].sort((a, b) => b.total - a.total).slice(0, 5);
  const topByQwirkles = isQwirkle
    ? [...filteredMatches].sort((a, b) => b.qwirkles - a.qwirkles).slice(0, 5)
    : [];
  const filteredPersonalScores = selectedPlayerId
    ? personalScores.filter((s) => s.playerId === selectedPlayerId)
    : personalScores;
  const topPersonalScores = [...filteredPersonalScores].sort((a, b) => b.score - a.score).slice(0, 5);
  const nameByPlayerId = new Map(leaderboard.map((p) => [p.playerId, p.name]));

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
          <LeaderboardDonut players={leaderboard} showQwirkles={isQwirkle} />
        </section>
      )}

      {showHeadToHeads && headToHeads.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-fredoka text-lg font-bold text-onjoo-green-900">Face à face</h2>
          <div className="flex flex-wrap justify-center gap-3">
            {headToHeads.map((h2h) => (
              <div key={h2h.key} className="card flex flex-col items-center gap-3 py-4">
                <HeadToHeadDonut playerA={h2h.playerA} playerB={h2h.playerB} totalGames={h2h.totalGames} />
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-center gap-1">
                    <AvatarBadge color={h2h.playerA.avatarColor} shape={h2h.playerA.avatarShape} size={28} />
                    <span className="font-quicksand text-xs font-semibold text-onjoo-green-900">
                      {h2h.playerA.name}
                    </span>
                  </div>
                  <span className="font-quicksand text-xs text-[#999]">vs</span>
                  <div className="flex flex-col items-center gap-1">
                    <AvatarBadge color={h2h.playerB.avatarColor} shape={h2h.playerB.avatarShape} size={28} />
                    <span className="font-quicksand text-xs font-semibold text-onjoo-green-900">
                      {h2h.playerB.name}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {leaderboard.length > 0 && (
        <PlayerFilterPills
          code={code}
          players={leaderboard.map((p) => ({ playerId: p.playerId, name: p.name }))}
          selected={selectedPlayerId}
        />
      )}

      {topPersonalScores.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-fredoka text-lg font-bold text-onjoo-green-900">Top 5 — meilleurs scores</h2>
          <div className="flex flex-col gap-2">
            {topPersonalScores.map((s, i) => (
              <Link key={`${s.matchId}-${s.playerId}`} href={`/matches/${s.matchId}`} className="card flex items-center gap-3 py-2.5">
                <span className="w-6 text-center font-fredoka text-sm font-bold text-[#999]">{i + 1}</span>
                <span className="flex-1 font-quicksand text-sm text-onjoo-green-900">
                  {nameByPlayerId.get(s.playerId) ?? "?"}
                </span>
                <span className="badge">{s.score} pts</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {topByTotal.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-fredoka text-lg font-bold text-onjoo-green-900">
            Top 5 — score total de la partie
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
            Top 5 — Qwirkles de la partie
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
