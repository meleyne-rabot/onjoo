"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AvatarBadge } from "@/components/AvatarBadge";
import {
  QWIRKLE_THRESHOLD,
  activeRoundIndex,
  applyFinishBonus,
  cumulativeTotals,
  determineWinners,
  estimatedQwirkleCounts,
  lastRoundIndexWithData,
  totalMatchPoints,
  type Round,
  type RoundDetail,
} from "./calc";

type Participant = {
  id: string; // match_players.id
  name: string;
  avatarColor: string;
  avatarShape: string;
};

export function QwirkleScoreScreen({
  matchId,
  gameCode,
  participants,
  initialRounds,
  initialStatus,
}: {
  matchId: string;
  gameCode: string;
  participants: Participant[];
  initialRounds: Round[];
  initialStatus: "in_progress" | "completed";
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [rounds, setRounds] = useState<Round[]>(initialRounds);
  const [status, setStatus] = useState(initialStatus);
  const [finisherId, setFinisherId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const participantIds = useMemo(
    () => participants.map((p) => p.id),
    [participants],
  );

  const [winners, setWinners] = useState<string[] | null>(
    initialStatus === "completed"
      ? determineWinners(cumulativeTotals(initialRounds, participantIds))
      : null,
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
  const qwirkleCounts = estimatedQwirkleCounts(rounds, participantIds);
  const matchTotal = totalMatchPoints(rounds);
  const activeRound = activeRoundIndex(rounds, participantIds);
  const lastIndex = lastRoundIndexWithData(rounds);
  const previewTotals = applyFinishBonus(totals, finisherId);

  function saveCell(matchPlayerId: string, roundIndex: number, points: number, detail: RoundDetail) {
    startTransition(async () => {
      await supabase.from("rounds").upsert(
        { match_id: matchId, match_player_id: matchPlayerId, round_index: roundIndex, points, detail },
        { onConflict: "match_player_id,round_index" },
      );
    });
  }

  function undoLastRound() {
    if (lastIndex === null) return;
    startTransition(async () => {
      await supabase.from("rounds").delete().eq("match_id", matchId).eq("round_index", lastIndex);
    });
  }

  function finishMatch() {
    const finalTotals = applyFinishBonus(totals, finisherId);
    const finalWinners = determineWinners(finalTotals);
    startTransition(async () => {
      await Promise.all(
        participants.map((participant) =>
          supabase
            .from("match_players")
            .update({
              final_score: finalTotals[participant.id] ?? 0,
              is_winner: finalWinners.includes(participant.id),
              finished_board: participant.id === finisherId,
            })
            .eq("id", participant.id),
        ),
      );
      await supabase
        .from("matches")
        .update({ status: "completed", played_at: new Date().toISOString() })
        .eq("id", matchId);

      setWinners(finalWinners);
      setStatus("completed");
    });
  }

  if (status === "completed" && winners) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
        <p className="text-6xl">🎉</p>
        <h1 className="font-fredoka text-3xl font-bold text-onjoo-green-900">
          {winners.length > 1 ? "Égalité !" : "Victoire !"}
        </h1>
        <div className="flex flex-wrap justify-center gap-6">
          {participants
            .filter((p) => winners.includes(p.id))
            .map((p) => (
              <div key={p.id} className="flex flex-col items-center gap-2">
                <AvatarBadge color={p.avatarColor} shape={p.avatarShape} size={64} />
                <span className="font-fredoka text-lg font-semibold text-onjoo-green-900">
                  {p.name}
                </span>
                <span className="font-quicksand text-[#777]">{totals[p.id]} points</span>
              </div>
            ))}
        </div>
        <p className="font-quicksand text-[#777]">
          Total de points de la partie : {matchTotal}
        </p>
        <button onClick={() => router.push(`/games/${gameCode}`)} className="btn-primary">
          Voir l&apos;historique
        </button>
      </main>
    );
  }

  const roundIndices = Array.from({ length: activeRound }, (_, i) => i + 1);
  const gridTemplateColumns = `52px repeat(${participants.length}, minmax(72px, 1fr))`;
  const finisherName = participants.find((p) => p.id === finisherId)?.name;

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 px-4 py-8 sm:px-6">
      <div>
        <h1 className="font-fredoka text-xl font-bold text-onjoo-green-900">Qwirkle</h1>
        <p className="font-quicksand text-sm text-[#777]">
          Un tour se sauvegarde tout seul dès que tu saisis un score.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#eee]">
        <div
          className="grid gap-px bg-[#eee]"
          style={{ gridTemplateColumns, minWidth: 52 + participants.length * 72 }}
        >
          <div className="bg-[#FAF1DE]" />
          {participants.map((participant) => (
            <div
              key={participant.id}
              className="flex flex-col items-center gap-1 bg-[#FAF1DE] px-1 py-2"
            >
              <AvatarBadge color={participant.avatarColor} shape={participant.avatarShape} size={26} />
              <span className="truncate font-quicksand text-[11px] font-bold text-onjoo-green-900">
                {participant.name}
              </span>
            </div>
          ))}

          {roundIndices.map((roundIndex) => (
            <RoundRow
              key={roundIndex}
              roundIndex={roundIndex}
              isActive={roundIndex === activeRound}
              participants={participants}
              rounds={rounds}
              onSave={saveCell}
            />
          ))}

          <div className="flex items-center justify-center bg-[#FAF1DE] px-1 py-2 font-fredoka text-xs font-bold text-onjoo-green-900">
            Total
          </div>
          {participants.map((participant) => (
            <div
              key={participant.id}
              className="flex flex-col items-center justify-center gap-0.5 bg-[#FAF1DE] px-1 py-2"
            >
              <span className="font-fredoka text-base font-bold text-onjoo-green-900">
                {previewTotals[participant.id] ?? 0}
              </span>
              {finisherId === participant.id && (
                <span className="font-quicksand text-[9px] font-bold text-onjoo-orange-500">
                  +6 fin
                </span>
              )}
              {(qwirkleCounts[participant.id] ?? 0) > 0 && (
                <span className="font-quicksand text-[9px] text-[#999]">
                  {qwirkleCounts[participant.id]} Qwirkle
                  {qwirkleCounts[participant.id] > 1 ? "s" : ""}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 font-quicksand text-xs text-onjoo-sage-500">
        <span className="h-1.5 w-1.5 rounded-full bg-onjoo-sage-500" />
        Enregistré automatiquement
      </div>

      <button
        onClick={undoLastRound}
        disabled={isPending || lastIndex === null}
        className="btn-secondary"
      >
        Annuler le dernier tour
      </button>

      <div className="card flex flex-col gap-3">
        <span className="font-quicksand text-xs font-bold uppercase tracking-wide text-onjoo-green-900">
          Qui a terminé le plateau ? (+6 pts bonus auto)
        </span>
        <div className="flex flex-wrap gap-2">
          {participants.map((participant) => (
            <button
              key={participant.id}
              type="button"
              onClick={() =>
                setFinisherId((current) => (current === participant.id ? null : participant.id))
              }
              className={`rounded-full border-2 px-3 py-1.5 font-quicksand text-sm font-bold ${
                finisherId === participant.id
                  ? "border-onjoo-green-900 text-onjoo-green-900"
                  : "border-[#ddd] text-[#999]"
              }`}
            >
              {participant.name}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={finishMatch}
        disabled={isPending || rounds.length === 0}
        className="btn-primary"
      >
        Terminer la partie{finisherName ? ` (+6 à ${finisherName})` : ""}
      </button>
    </main>
  );
}

function RoundRow({
  roundIndex,
  isActive,
  participants,
  rounds,
  onSave,
}: {
  roundIndex: number;
  isActive: boolean;
  participants: Participant[];
  rounds: Round[];
  onSave: (matchPlayerId: string, roundIndex: number, points: number, detail: RoundDetail) => void;
}) {
  return (
    <>
      <div className="flex items-center justify-center bg-white px-1 py-2 font-quicksand text-xs font-bold text-[#999]">
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
              key={round ? `${round.id}-${round.points}-${round.detail?.qwirkle}` : "empty"}
              round={round}
              highlighted={isActive}
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
  onSave,
}: {
  round: Round | undefined;
  highlighted: boolean;
  onSave: (points: number, detail: RoundDetail) => void;
}) {
  // Pas de useEffect pour resynchroniser depuis `round` : le parent force
  // un remount (via sa prop key) quand la valeur change côté serveur,
  // donc cet état initial reste toujours à jour sans re-render en cascade.
  const [value, setValue] = useState(round ? String(round.points) : "");
  const [qwirkle, setQwirkle] = useState<boolean | undefined>(round?.detail?.qwirkle);

  const numericValue = value === "" ? null : Number(value) || 0;
  const showQwirkleToggle = numericValue !== null && numericValue > QWIRKLE_THRESHOLD;

  function commit(nextQwirkle?: boolean) {
    if (value === "") return;
    const points = Number(value) || 0;
    const detail: RoundDetail =
      nextQwirkle !== undefined ? { qwirkle: nextQwirkle } : qwirkle !== undefined ? { qwirkle } : {};
    onSave(points, detail);
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <input
        type="number"
        inputMode="numeric"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onBlur={() => commit()}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            (event.target as HTMLInputElement).blur();
          }
        }}
        placeholder="–"
        className="h-8 w-10 rounded-lg border text-center font-quicksand text-sm font-bold text-onjoo-green-900 focus:outline-none"
        style={{ borderWidth: highlighted ? 2 : 1, borderColor: highlighted ? "#163D2E" : "#ddd" }}
      />
      {showQwirkleToggle && (
        <div className="flex gap-0.5 rounded-full bg-[#FAF1DE] p-0.5">
          <button
            type="button"
            onClick={() => {
              setQwirkle(true);
              commit(true);
            }}
            className="rounded-full px-1.5 py-0.5 font-quicksand text-[9px] font-bold"
            style={{
              background: qwirkle === true ? "#163D2E" : "transparent",
              color: qwirkle === true ? "#fff" : "#999",
            }}
          >
            Qwirkle
          </button>
          <button
            type="button"
            onClick={() => {
              setQwirkle(false);
              commit(false);
            }}
            className="rounded-full px-1.5 py-0.5 font-quicksand text-[9px] font-bold"
            style={{
              background: qwirkle === false ? "#163D2E" : "transparent",
              color: qwirkle === false ? "#fff" : "#999",
            }}
          >
            Non
          </button>
        </div>
      )}
    </div>
  );
}
