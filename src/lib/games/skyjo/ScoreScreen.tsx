"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AvatarBadge } from "@/components/AvatarBadge";
import {
  activeRoundIndex,
  cumulativeTotals,
  determineWinners,
  lastRoundIndexWithData,
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

export function SkyjoScoreScreen({
  matchId,
  gameCode,
  participants,
  initialRounds,
  initialStatus,
  initialTurnOrderSet,
}: {
  matchId: string;
  gameCode: string;
  participants: Participant[];
  initialRounds: Round[];
  initialStatus: "in_progress" | "completed";
  initialFinisherId: string | null;
  initialTurnOrderSet: boolean;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [rounds, setRounds] = useState<Round[]>(initialRounds);
  const [status, setStatus] = useState(initialStatus);
  const [turnOrderIds, setTurnOrderIds] = useState<string[] | null>(null);
  const [turnOrderSet, setTurnOrderSet] = useState(initialTurnOrderSet);
  const [isPending, startTransition] = useTransition();

  const orderedParticipants = useMemo(() => {
    if (!turnOrderIds) return participants;
    const byId = new Map(participants.map((p) => [p.id, p]));
    return turnOrderIds
      .map((id) => byId.get(id))
      .filter((p): p is Participant => Boolean(p));
  }, [participants, turnOrderIds]);

  const participantIds = useMemo(
    () => orderedParticipants.map((p) => p.id),
    [orderedParticipants],
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

  function pickStarter(starterId: string) {
    const baseOrder = orderedParticipants.map((p) => p.id);
    const startIndex = baseOrder.indexOf(starterId);
    const rotated = [...baseOrder.slice(startIndex), ...baseOrder.slice(0, startIndex)];
    setTurnOrderIds(rotated);
    setTurnOrderSet(true);
    startTransition(async () => {
      await Promise.all(
        rotated.map((id, index) =>
          supabase.from("match_players").update({ turn_order: index }).eq("id", id),
        ),
      );
    });
  }

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

  function finishMatch() {
    const finalWinners = determineWinners(totals);
    startTransition(async () => {
      await Promise.all(
        orderedParticipants.map((participant) =>
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
  const gridTemplateColumns = `52px repeat(${orderedParticipants.length}, minmax(92px, 1fr))`;

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 px-4 py-8 sm:px-6">
      {isCompleted && (
        <div className="card flex flex-col items-center gap-2 text-center">
          <p className="text-4xl">🎉</p>
          <h1 className="font-fredoka text-2xl font-bold text-onjoo-green-900">
            {winners.length > 1 ? "Égalité !" : "Victoire !"}
          </h1>
          <div className="flex flex-wrap justify-center gap-4">
            {orderedParticipants
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

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-fredoka text-xl font-bold text-onjoo-green-900">Skyjo</h1>
          {!isCompleted && (
            <p className="font-quicksand text-sm text-[#777]">
              Un tour se sauvegarde tout seul dès que tu saisis un score.
            </p>
          )}
        </div>
        <span className="badge">Total partie : {matchTotal}</span>
      </div>

      {overTarget.length > 0 && (
        <div className="card flex items-center gap-2" style={{ borderColor: "#d64545" }}>
          <span className="font-quicksand text-sm font-semibold" style={{ color: "#d64545" }}>
            {orderedParticipants
              .filter((p) => overTarget.includes(p.id))
              .map((p) => p.name)
              .join(", ")}{" "}
            {overTarget.length > 1 ? "ont" : "a"} atteint {TARGET_SCORE} pts — la partie peut se
            terminer (rappel : le score le plus bas gagne).
          </span>
        </div>
      )}

      {!turnOrderSet && !isCompleted && (
        <div className="card flex flex-col gap-3">
          <span className="font-quicksand text-xs font-bold uppercase tracking-wide text-onjoo-green-900">
            Qui commence ?
          </span>
          <div className="flex flex-wrap gap-2">
            {orderedParticipants.map((participant) => (
              <button
                key={participant.id}
                type="button"
                onClick={() => pickStarter(participant.id)}
                className="rounded-full border-2 border-[#ddd] px-3 py-1.5 font-quicksand text-sm font-bold text-onjoo-green-900"
              >
                {participant.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-[#eee]">
        <div
          className="grid gap-px bg-[#eee]"
          style={{ gridTemplateColumns, minWidth: 52 + orderedParticipants.length * 92 }}
        >
          <div className="sticky top-0 z-10 bg-[#FAF1DE]" />
          {orderedParticipants.map((participant) => (
            <div
              key={participant.id}
              className="sticky top-0 z-10 flex flex-col items-center gap-1 bg-[#FAF1DE] px-1 py-2.5"
            >
              <AvatarBadge color={participant.avatarColor} shape={participant.avatarShape} size={32} />
              <span className="truncate font-quicksand text-sm font-bold text-onjoo-green-900">
                {participant.name}
              </span>
            </div>
          ))}

          {roundIndices.map((roundIndex) => (
            <RoundRow
              key={roundIndex}
              roundIndex={roundIndex}
              isActive={!isCompleted && roundIndex === activeRound}
              disabled={isCompleted}
              participants={orderedParticipants}
              rounds={rounds}
              onSave={saveCell}
            />
          ))}

          <div className="sticky bottom-0 z-10 flex items-center justify-center bg-[#FAF1DE] px-1 py-2.5 font-fredoka text-sm font-bold text-onjoo-green-900">
            Total
          </div>
          {orderedParticipants.map((participant) => (
            <div
              key={participant.id}
              className="sticky bottom-0 z-10 flex flex-col items-center justify-center gap-0.5 bg-[#FAF1DE] px-1 py-2.5"
            >
              <span className="font-fredoka text-lg font-bold text-onjoo-green-900">
                {totals[participant.id] ?? 0}
              </span>
              {overTarget.includes(participant.id) && (
                <span className="font-quicksand text-[10px] font-bold" style={{ color: "#d64545" }}>
                  {TARGET_SCORE}+
                </span>
              )}
            </div>
          ))}
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
}: {
  roundIndex: number;
  isActive: boolean;
  disabled: boolean;
  participants: Participant[];
  rounds: Round[];
  onSave: (matchPlayerId: string, roundIndex: number, points: number, detail: RoundDetail) => void;
}) {
  return (
    <>
      <div className="flex items-center justify-center bg-white px-1 py-2 font-quicksand text-sm font-bold text-[#999]">
        T{roundIndex}
      </div>
      {participants.map((participant) => {
        const round = rounds.find(
          (r) => r.match_player_id === participant.id && r.round_index === roundIndex,
        );
        return (
          <div key={participant.id} className="flex items-center justify-center bg-white px-1 py-2">
            <ScoreCell
              // Remonte (et resynchronise son état local) si la valeur
              // change côté serveur (ex. correction sur un autre appareil).
              key={round ? `${round.id}-${round.points}` : "empty"}
              round={round}
              highlighted={isActive}
              disabled={disabled}
              onSave={(points, detail) => onSave(participant.id, roundIndex, points, detail)}
            />
          </div>
        );
      })}
    </>
  );
}

function ScoreCell({
  round,
  highlighted,
  disabled,
  onSave,
}: {
  round: Round | undefined;
  highlighted: boolean;
  disabled: boolean;
  onSave: (points: number, detail: RoundDetail) => void;
}) {
  // Pas de useEffect pour resynchroniser depuis `round` : le parent force
  // un remount (via sa prop key) quand la valeur change côté serveur,
  // donc cet état initial reste toujours à jour sans re-render en cascade.
  const [value, setValue] = useState(round ? String(round.points) : "");

  function commit() {
    if (value === "" || disabled) return;
    onSave(Number(value) || 0, {});
  }

  return (
    <input
      // Pas d'inputMode="numeric" : à Skyjo les scores peuvent être
      // négatifs (cartes -2), il faut garder le clavier complet avec "-".
      type="number"
      value={value}
      disabled={disabled}
      onChange={(event) => setValue(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          (event.target as HTMLInputElement).blur();
        }
      }}
      placeholder="–"
      className="h-11 w-14 rounded-lg border text-center font-quicksand text-lg font-bold text-onjoo-green-900 focus:outline-none disabled:opacity-70"
      style={{ borderWidth: highlighted ? 2 : 1, borderColor: highlighted ? "#163D2E" : "#ddd" }}
    />
  );
}
