"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AvatarBadge } from "@/components/AvatarBadge";
import { RulesButton } from "@/components/RulesButton";
import { RefreshButton } from "@/components/RefreshButton";
import { useMatchPresence } from "@/hooks/useMatchPresence";
import {
  activeRoundIndex,
  cumulativeTotals,
  determineWinners,
  lastRoundIndexWithData,
  playersApproachingTarget,
  playersOverTarget,
  TARGET_SCORE,
  type Round,
  type RoundDetail,
} from "./calc";

type Participant = {
  id: string; // match_players.id
  name: string;
  avatarColor: string;
  avatarShape: string;
};

export function Flip7ScoreScreen({
  matchId,
  gameCode,
  participants,
  initialRounds,
  initialStatus,
  me,
}: {
  matchId: string;
  leagueId: string;
  gameCode: string;
  participants: Participant[];
  initialRounds: Round[];
  initialStatus: "in_progress" | "completed";
  initialFinisherId: string | null;
  initialTurnOrderSet: boolean;
  me: Participant;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { others, editorsByCell, setEditingCell } = useMatchPresence(supabase, matchId, me);
  const [rounds, setRounds] = useState<Round[]>(initialRounds);
  const [status, setStatus] = useState(initialStatus);
  const [isPending, startTransition] = useTransition();
  // Le conteneur qui défile horizontalement devient malgré lui aussi la
  // référence de défilement vertical (effet de bord CSS), ce qui casse
  // le sticky top/bottom de l'en-tête et du total s'ils sont dedans. On
  // les sort donc dans leurs propres conteneurs, ancrés sur le scroll
  // réel de la page, et on synchronise leur défilement horizontal en JS
  // avec celui du corps du tableau.
  const bodyScrollRef = useRef<HTMLDivElement>(null);
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const totalScrollRef = useRef<HTMLDivElement>(null);

  function syncHorizontalScroll() {
    const left = bodyScrollRef.current?.scrollLeft ?? 0;
    if (headerScrollRef.current) headerScrollRef.current.scrollLeft = left;
    if (totalScrollRef.current) totalScrollRef.current.scrollLeft = left;
  }

  const participantIds = useMemo(
    () => participants.map((p) => p.id),
    [participants],
  );

  useEffect(() => {
    const channel = supabase
      .channel(`rounds-${matchId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "rounds", filter: `match_id=eq.${matchId}` },
        (payload) => {
          const row = payload.new as Round;
          setRounds((current) =>
            current.some((r) => r.id === row.id) ? current : [...current, row],
          );
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rounds", filter: `match_id=eq.${matchId}` },
        (payload) => {
          const row = payload.new as Round;
          setRounds((current) => current.map((r) => (r.id === row.id ? row : r)));
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "rounds", filter: `match_id=eq.${matchId}` },
        (payload) => {
          const oldRow = payload.old as { id: string };
          setRounds((current) => current.filter((r) => r.id !== oldRow.id));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, matchId]);

  const totals = cumulativeTotals(rounds, participantIds);
  const matchTotal = Object.values(totals).reduce((sum, v) => sum + v, 0);
  const activeRound = activeRoundIndex(rounds, participantIds);
  const lastIndex = lastRoundIndexWithData(rounds);
  const isCompleted = status === "completed";
  const winners = isCompleted ? determineWinners(totals) : [];
  const winnerPoints = winners.length > 0 ? totals[winners[0]] ?? 0 : 0;
  const overTarget = !isCompleted ? playersOverTarget(totals) : [];
  const approachingTarget = !isCompleted ? playersApproachingTarget(totals) : [];

  function saveCell(matchPlayerId: string, roundIndex: number, points: number, detail: RoundDetail) {
    startTransition(async () => {
      const { error } = await supabase.from("rounds").upsert(
        { match_id: matchId, match_player_id: matchPlayerId, round_index: roundIndex, points, detail },
        { onConflict: "match_player_id,round_index" },
      );
      if (error) console.error("saveCell failed:", error.message);
    });
  }

  function undoLastRound() {
    if (lastIndex === null) return;
    startTransition(async () => {
      await supabase.from("rounds").delete().eq("match_id", matchId).eq("round_index", lastIndex);
    });
  }

  function cancelMatch() {
    if (!confirm("Annuler cette partie ? Elle sera définitivement supprimée, sans trace dans l'historique.")) {
      return;
    }
    startTransition(async () => {
      await supabase.from("matches").delete().eq("id", matchId);
      router.push(`/games/${gameCode}`);
    });
  }

  function finishMatch() {
    const finalWinners = determineWinners(totals);
    startTransition(async () => {
      await Promise.all(
        participants.map((participant) =>
          supabase
            .from("match_players")
            .update({
              final_score: totals[participant.id] ?? 0,
              is_winner: finalWinners.includes(participant.id),
            })
            .eq("id", participant.id),
        ),
      );
      await supabase
        .from("matches")
        .update({ status: "completed", played_at: new Date().toISOString() })
        .eq("id", matchId);

      setStatus("completed");
    });
  }

  const roundIndices = isCompleted
    ? Array.from(new Set(rounds.map((r) => r.round_index))).sort((a, b) => a - b)
    : Array.from({ length: activeRound }, (_, i) => i + 1);
  const gridTemplateColumns = `52px repeat(${participants.length}, minmax(92px, 1fr))`;

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 px-4 py-8 sm:px-6">
      {isCompleted && (
        <div className="card flex flex-col items-center gap-2 text-center">
          <p className="text-4xl">🎉</p>
          <h1 className="font-fredoka text-2xl font-bold text-onjoo-green-900">
            {winners.length > 1 ? "Égalité !" : "Victoire !"}
          </h1>
          <div className="flex flex-wrap justify-center gap-4">
            {participants
              .filter((p) => winners.includes(p.id))
              .map((p) => (
                <div key={p.id} className="flex flex-col items-center gap-1">
                  <AvatarBadge color={p.avatarColor} shape={p.avatarShape} size={44} />
                  <span className="font-fredoka text-sm font-semibold text-onjoo-green-900">
                    {p.name}
                  </span>
                </div>
              ))}
          </div>
          <span className="badge">{winnerPoints} pts</span>
          <button
            onClick={() => router.push(`/games/${gameCode}`)}
            className="btn-primary mt-2"
          >
            Voir l&apos;historique
          </button>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <RulesButton gameCode="flip7" gameName="Flip 7" />
          <RefreshButton />
          <div>
            <h1 className="font-fredoka text-xl font-bold text-onjoo-green-900">Flip 7</h1>
            {!isCompleted && (
              <p className="font-quicksand text-sm text-[#777]">
                Un tour se sauvegarde tout seul dès que tu saisis un score.
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {others.length > 0 && (
            <div className="flex items-center -space-x-2" title={`${others.length} connecté·s`}>
              {others.map((o) => (
                <div key={o.id} className="relative">
                  <AvatarBadge color={o.avatarColor} shape={o.avatarShape} size={26} />
                  <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border-2 border-white bg-onjoo-sage-500" />
                </div>
              ))}
            </div>
          )}
          <span className="badge">Total partie : {matchTotal}</span>
        </div>
      </div>

      {overTarget.length > 0 && (
        <div className="card flex items-center gap-2" style={{ borderColor: "#d64545" }}>
          <span className="font-quicksand text-sm font-semibold" style={{ color: "#d64545" }}>
            {participants
              .filter((p) => overTarget.includes(p.id))
              .map((p) => p.name)
              .join(", ")}{" "}
            {overTarget.length > 1 ? "ont" : "a"} atteint {TARGET_SCORE} pts — la partie peut se
            terminer.
          </span>
        </div>
      )}

      <div className="rounded-xl border border-[#eee]">
        <div ref={headerScrollRef} className="sticky top-0 z-20 overflow-x-hidden rounded-t-xl bg-[#FAF1DE]">
          <div
            className="grid"
            style={{ gridTemplateColumns, minWidth: 52 + participants.length * 92 }}
          >
            <div />
            {participants.map((participant) => (
              <div key={participant.id} className="flex flex-col items-center gap-1 px-1 py-2.5">
                <AvatarBadge color={participant.avatarColor} shape={participant.avatarShape} size={32} />
                <span className="truncate font-quicksand text-sm font-bold text-onjoo-green-900">
                  {participant.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div ref={bodyScrollRef} onScroll={syncHorizontalScroll} className="overflow-x-auto">
          <div
            className="grid gap-px bg-[#eee]"
            style={{ gridTemplateColumns, minWidth: 52 + participants.length * 92 }}
          >
            {roundIndices.map((roundIndex) => (
              <RoundRow
                key={roundIndex}
                roundIndex={roundIndex}
                isActive={!isCompleted && roundIndex === activeRound}
                disabled={isCompleted}
                participants={participants}
                rounds={rounds}
                onSave={saveCell}
                editorsByCell={editorsByCell}
                onFocusCell={setEditingCell}
              />
            ))}
          </div>
        </div>

        <div ref={totalScrollRef} className="sticky bottom-0 z-20 overflow-x-hidden rounded-b-xl bg-[#FAF1DE]">
          <div
            className="grid"
            style={{ gridTemplateColumns, minWidth: 52 + participants.length * 92 }}
          >
            <div className="flex items-center justify-center px-1 py-2.5 font-fredoka text-sm font-bold text-onjoo-green-900">
              Total
            </div>
            {participants.map((participant) => (
              <div key={participant.id} className="flex flex-col items-center justify-center gap-0.5 px-1 py-2.5">
                <span className="font-fredoka text-lg font-bold text-onjoo-green-900">
                  {totals[participant.id] ?? 0}
                </span>
                {overTarget.includes(participant.id) && (
                  <span className="font-quicksand text-[10px] font-bold" style={{ color: "#d64545" }}>
                    {TARGET_SCORE}+
                  </span>
                )}
                {approachingTarget.includes(participant.id) && (
                  <span className="font-quicksand text-[10px] font-bold text-onjoo-sage-500">
                    reste {TARGET_SCORE - (totals[participant.id] ?? 0)} pour gagner
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {!isCompleted && (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-quicksand text-xs text-onjoo-sage-500">
              <span className="h-1.5 w-1.5 rounded-full bg-onjoo-sage-500" />
              Enregistré automatiquement
            </div>
            <button
              onClick={undoLastRound}
              disabled={isPending || lastIndex === null}
              className="font-quicksand text-xs font-semibold text-[#999] underline disabled:opacity-40"
            >
              Annuler le dernier tour
            </button>
          </div>

          <button
            onClick={finishMatch}
            disabled={isPending || rounds.length === 0}
            className="btn-primary"
          >
            Terminer la partie
          </button>

          <button
            onClick={cancelMatch}
            disabled={isPending}
            className="font-quicksand text-xs font-semibold text-onjoo-red-500 underline disabled:opacity-40"
          >
            Annuler la partie
          </button>
        </>
      )}
    </main>
  );
}

function RoundRow({
  roundIndex,
  isActive,
  disabled,
  participants,
  rounds,
  onSave,
  editorsByCell,
  onFocusCell,
}: {
  roundIndex: number;
  isActive: boolean;
  disabled: boolean;
  participants: Participant[];
  rounds: Round[];
  onSave: (matchPlayerId: string, roundIndex: number, points: number, detail: RoundDetail) => void;
  editorsByCell: Map<string, { avatarColor: string }>;
  onFocusCell: (cell: string | null) => void;
}) {
  return (
    <>
      <div className="sticky left-0 z-10 flex items-center justify-center bg-white px-1 py-2 font-quicksand text-sm font-bold text-[#999]">
        T{roundIndex}
      </div>
      {participants.map((participant) => {
        const round = rounds.find(
          (r) => r.match_player_id === participant.id && r.round_index === roundIndex,
        );
        const editor = editorsByCell.get(`${participant.id}:${roundIndex}`);
        return (
          <div key={participant.id} className="flex items-center justify-center bg-white px-1 py-2">
            <ScoreCell
              // Remonte (et resynchronise son état local) si la valeur
              // change côté serveur (ex. correction sur un autre appareil).
              key={round ? `${round.id}-${round.points}` : "empty"}
              round={round}
              participantName={participant.name}
              highlighted={isActive}
              disabled={disabled}
              editingColor={editor?.avatarColor}
              onSave={(points, detail) => onSave(participant.id, roundIndex, points, detail)}
              onFocusCell={() => onFocusCell(`${participant.id}:${roundIndex}`)}
              onBlurCell={() => onFocusCell(null)}
            />
          </div>
        );
      })}
    </>
  );
}

function ScoreCell({
  round,
  participantName,
  highlighted,
  disabled,
  editingColor,
  onSave,
  onFocusCell,
  onBlurCell,
}: {
  round: Round | undefined;
  participantName: string;
  highlighted: boolean;
  disabled: boolean;
  editingColor: string | undefined;
  onSave: (points: number, detail: RoundDetail) => void;
  onFocusCell: () => void;
  onBlurCell: () => void;
}) {
  // Pas de useEffect pour resynchroniser depuis `round` : le parent force
  // un remount (via sa prop key) quand la valeur change côté serveur,
  // donc cet état initial reste toujours à jour sans re-render en cascade.
  const [value, setValue] = useState(round ? String(round.points) : "");
  // Le clavier mobile perturbe le sticky de l'en-tête (limitation des
  // navigateurs, pas un bug d'ici) : pendant la saisie, on affiche le nom
  // du joueur juste au-dessus de la case pour ne jamais perdre le repère.
  const [focused, setFocused] = useState(false);

  function commit() {
    if (value === "" || disabled) return;
    onSave(Number(value) || 0, {});
  }

  return (
    <div className="relative flex items-center justify-center">
      {focused && (
        <span
          className="absolute bottom-full z-30 mb-1 whitespace-nowrap rounded-full px-2.5 py-1 font-quicksand text-xs font-bold text-white"
          style={{ background: "#163D2E" }}
        >
          {participantName}
        </span>
      )}
      <input
        type="number"
        inputMode="numeric"
        value={value}
        disabled={disabled}
        onChange={(event) => setValue(event.target.value)}
        onFocus={() => {
          setFocused(true);
          onFocusCell();
        }}
        onBlur={() => {
          setFocused(false);
          commit();
          onBlurCell();
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            (event.target as HTMLInputElement).blur();
          }
        }}
        placeholder="–"
        className={`h-11 w-14 rounded-lg border text-center font-quicksand text-lg font-bold text-onjoo-green-900 focus:outline-none disabled:opacity-70 ${editingColor ? "animate-pulse" : ""}`}
        style={{
          borderWidth: highlighted || editingColor ? 2 : 1,
          borderColor: editingColor ?? (highlighted ? "#163D2E" : "#ddd"),
        }}
      />
    </div>
  );
}
