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

type Segment = { key: string; avatarColor: string; wins: number };

// Anneau seul (pas de légende, pas d'étiquette) — la répartition des
// victoires entre N joueurs, dans l'ordre fourni.
function Ring({ segments, size = 130, strokeWidth = 20 }: { segments: Segment[]; size?: number; strokeWidth?: number }) {
  const cx = size / 2;
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const total = segments.reduce((sum, s) => sum + s.wins, 0);

  const arcs = segments.reduce<{ key: string; avatarColor: string; len: number; offset: number }[]>((acc, s) => {
    const cumulative = acc.reduce((sum, a) => sum + a.len, 0);
    const fraction = total > 0 ? s.wins / total : 1 / segments.length;
    const len = fraction * circumference;
    acc.push({ key: s.key, avatarColor: s.avatarColor, len, offset: -cumulative });
    return acc;
  }, []);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="#eee" strokeWidth={strokeWidth} />
      {arcs.map((a) => (
        <circle
          key={a.key}
          cx={cx}
          cy={cx}
          r={r}
          fill="none"
          stroke={a.avatarColor}
          strokeWidth={strokeWidth}
          strokeDasharray={`${a.len} ${circumference - a.len}`}
          strokeDashoffset={a.offset}
          transform={`rotate(-90 ${cx} ${cx})`}
        />
      ))}
    </svg>
  );
}

// Anneau + légende (point coloré, nom, %) à droite — utilisé pour le
// classement général comme pour un face-à-face, la légende fait toujours
// le lien couleur ↔ joueur, plus besoin d'étiquettes sur l'anneau lui-même.
function DonutWithLegend({
  title,
  players,
}: {
  title: string;
  players: { key: string; name: string; avatarColor: string; wins: number }[];
}) {
  const total = players.reduce((sum, p) => sum + p.wins, 0);
  return (
    <div className="card flex items-center gap-5 py-5">
      <Ring segments={players} />
      <div className="flex flex-col gap-2">
        <span className="font-quicksand text-sm font-semibold text-[#999]">{title}</span>
        {players.map((p) => (
          <div key={p.key} className="flex items-center gap-2">
            <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: p.avatarColor }} />
            <span className="font-fredoka text-base font-bold text-onjoo-green-900">
              {p.name} · {total > 0 ? Math.round((p.wins / total) * 100) : 0}%
            </span>
          </div>
        ))}
      </div>
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

function LeaderCard({ player, showQwirkles }: { player: LeaderRow; showQwirkles: boolean }) {
  return (
    <div className="card flex items-center gap-3 py-4">
      <AvatarBadge color={player.avatarColor} shape={player.avatarShape} size={48} />
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-1.5">
          <span className="font-fredoka text-lg font-bold text-onjoo-green-900">{player.name}</span>
          <span>⭐</span>
          <span className="font-fredoka text-lg font-bold text-onjoo-green-900">{player.wins}</span>
        </div>
        <span className="font-quicksand text-sm text-[#777]">
          {player.played} partie{player.played > 1 ? "s" : ""} · {Math.round(player.totalScore / player.played)} pts
          moy.
          {showQwirkles && ` · ${player.totalQwirkles} Qwirkles`}
        </span>
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
    };
  });

  const leaderMap = new Map<string, LeaderRow>();
  const personalScores: { playerId: string; matchId: string; score: number }[] = [];
  const personalQwirkles: { playerId: string; matchId: string; qwirkles: number }[] = [];
  for (const m of rows) {
    for (const mp of m.match_players ?? []) {
      // Joueur ponctuel (pas de fiche) : pas d'identité à suivre dans un classement.
      if (!mp.player_id) continue;
      const player = playerOf(mp);
      if (!player) continue;
      const mpQwirkles = qwirklesByMatchPlayer.get(mp.id) ?? 0;
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
      existing.totalQwirkles += mpQwirkles;
      leaderMap.set(mp.player_id, existing);
      personalScores.push({ playerId: mp.player_id, matchId: m.id, score: mp.final_score ?? 0 });
      if (isQwirkle) personalQwirkles.push({ playerId: mp.player_id, matchId: m.id, qwirkles: mpQwirkles });
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

  const nameByPlayerId = new Map(leaderboard.map((p) => [p.playerId, p.name]));
  const selectedName = selectedPlayerId ? nameByPlayerId.get(selectedPlayerId) : undefined;

  // "Tous" sélectionné : classement des PARTIES par cumul des deux scores.
  // Un joueur précis sélectionné : classement de SES scores individuels
  // (change complètement de sens plutôt que de juste filtrer la même
  // liste — deux questions différentes : "la meilleure partie" vs "mon
  // meilleur score").
  type TopEntry = { id: string; label: string; value: number };
  const topScores: TopEntry[] = selectedPlayerId
    ? personalScores
        .filter((s) => s.playerId === selectedPlayerId)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map((s) => ({ id: s.matchId, label: selectedName ?? "?", value: s.score }))
    : [...matchSummaries]
        .sort((a, b) => b.total - a.total)
        .slice(0, 5)
        .map((m) => ({ id: m.id, label: m.names, value: m.total }));

  const topQwirkles: TopEntry[] = !isQwirkle
    ? []
    : selectedPlayerId
      ? personalQwirkles
          .filter((s) => s.playerId === selectedPlayerId)
          .sort((a, b) => b.qwirkles - a.qwirkles)
          .slice(0, 5)
          .map((s) => ({ id: s.matchId, label: selectedName ?? "?", value: s.qwirkles }))
      : [...matchSummaries]
          .sort((a, b) => b.qwirkles - a.qwirkles)
          .slice(0, 5)
          .map((m) => ({ id: m.id, label: m.names, value: m.qwirkles }));

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
          <DonutWithLegend
            title="Répartition des victoires"
            players={leaderboard.map((p) => ({ key: p.playerId, name: p.name, avatarColor: p.avatarColor, wins: p.wins }))}
          />
          <div className="flex flex-col gap-2">
            {leaderboard.map((p) => (
              <LeaderCard key={p.playerId} player={p} showQwirkles={isQwirkle} />
            ))}
          </div>
        </section>
      )}

      {showHeadToHeads && headToHeads.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-fredoka text-lg font-bold text-onjoo-green-900">Face à face</h2>
          <div className="flex flex-col gap-3">
            {headToHeads.map((h2h) => (
              <DonutWithLegend
                key={h2h.key}
                title={`${h2h.playerA.name} vs ${h2h.playerB.name}`}
                players={[
                  { key: h2h.playerA.playerId, name: h2h.playerA.name, avatarColor: h2h.playerA.avatarColor, wins: h2h.playerA.wins },
                  { key: h2h.playerB.playerId, name: h2h.playerB.name, avatarColor: h2h.playerB.avatarColor, wins: h2h.playerB.wins },
                ]}
              />
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

      {topScores.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-fredoka text-lg font-bold text-onjoo-green-900">
            Top 5 — {selectedPlayerId ? `meilleurs scores de ${selectedName}` : "score total de la partie"}
          </h2>
          <div className="flex flex-col gap-2">
            {topScores.map((entry, i) => (
              <Link key={`${entry.id}-${i}`} href={`/matches/${entry.id}`} className="card flex items-center gap-3 py-2.5">
                <span className="w-6 text-center font-fredoka text-sm font-bold text-[#999]">{i + 1}</span>
                <span className="flex-1 font-quicksand text-sm text-onjoo-green-900">{entry.label}</span>
                <span className="badge">{entry.value} pts</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {topQwirkles.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-fredoka text-lg font-bold text-onjoo-green-900">
            Top 5 — {selectedPlayerId ? `Qwirkles de ${selectedName}` : "Qwirkles de la partie"}
          </h2>
          <div className="flex flex-col gap-2">
            {topQwirkles.map((entry, i) => (
              <Link key={`${entry.id}-${i}`} href={`/matches/${entry.id}`} className="card flex items-center gap-3 py-2.5">
                <span className="w-6 text-center font-fredoka text-sm font-bold text-[#999]">{i + 1}</span>
                <span className="flex-1 font-quicksand text-sm text-onjoo-green-900">{entry.label}</span>
                <span className="badge">
                  {entry.value} Qwirkle{entry.value > 1 ? "s" : ""}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
