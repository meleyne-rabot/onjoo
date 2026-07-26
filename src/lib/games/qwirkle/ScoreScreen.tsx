"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AvatarBadge } from "@/components/AvatarBadge";
import {
  cumulativeTotals,
  determineWinners,
  estimatedQwirkleCounts,
  lastRoundIndex,
  nextRoundIndex,
  totalMatchPoints,
  type Round,
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
  const [inputs, setInputs] = useState<Record<string, string>>({});
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
        {
          event: "INSERT",
          schema: "public",
          table: "rounds",
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          const row = payload.new as Round;
          setRounds((current) =>
            current.some((r) => r.id === row.id) ? current : [...current, row],
          );
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "rounds",
          filter: `match_id=eq.${matchId}`,
        },
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
  const currentRoundIndex = nextRoundIndex(rounds);
  const lastIndex = lastRoundIndex(rounds);

  function submitRound() {
    const rows = participants.map((participant) => ({
      match_id: matchId,
      match_player_id: participant.id,
      round_index: currentRoundIndex,
      points: Number(inputs[participant.id] ?? 0) || 0,
    }));

    startTransition(async () => {
      await supabase.from("rounds").insert(rows);
      setInputs({});
    });
  }

  function undoLastRound() {
    if (lastIndex === null) return;
    startTransition(async () => {
      await supabase
        .from("rounds")
        .delete()
        .eq("match_id", matchId)
        .eq("round_index", lastIndex);
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
                <span className="font-quicksand text-[#777]">
                  {totals[p.id]} points
                </span>
              </div>
            ))}
        </div>
        <p className="font-quicksand text-[#777]">
          Total de points de la partie : {matchTotal}
        </p>
        <button
          onClick={() => router.push(`/games/${gameCode}`)}
          className="btn-primary"
        >
          Voir l&apos;historique
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col gap-6 px-6 py-8">
      <header className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <h1 className="font-fredoka text-xl font-bold text-onjoo-green-900">
            Qwirkle — Tour {currentRoundIndex}
          </h1>
          <span className="badge">Total partie : {matchTotal}</span>
        </div>
        <p className="font-quicksand text-sm text-[#777]">
          Entre le score de chaque joueur pour ce tour, puis valide.
        </p>
      </header>

      <section className="flex flex-col gap-4">
        {participants.map((participant, index) => (
          <div key={participant.id} className="card flex items-center gap-4">
            <AvatarBadge color={participant.avatarColor} shape={participant.avatarShape} />
            <div className="flex flex-1 flex-col">
              <span className="font-quicksand text-lg font-medium text-onjoo-green-900">
                {participant.name}
              </span>
              <span className="font-quicksand text-sm text-[#777]">
                Total : {totals[participant.id] ?? 0}
                {(qwirkleCounts[participant.id] ?? 0) > 0 &&
                  ` · ${qwirkleCounts[participant.id]} Qwirkle${
                    qwirkleCounts[participant.id] > 1 ? "s" : ""
                  } probable${qwirkleCounts[participant.id] > 1 ? "s" : ""}`}
              </span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <input
                type="number"
                inputMode="numeric"
                min={0}
                autoFocus={index === 0}
                value={inputs[participant.id] ?? ""}
                onChange={(event) =>
                  setInputs((current) => ({
                    ...current,
                    [participant.id]: event.target.value,
                  }))
                }
                placeholder="0"
                className="input-field w-20 text-center text-xl"
              />
              <span className="font-quicksand text-[10px] uppercase tracking-wide text-[#999]">
                Ce tour
              </span>
            </div>
          </div>
        ))}
      </section>

      <div className="flex flex-col gap-3">
        <button onClick={submitRound} disabled={isPending} className="btn-primary">
          Valider le tour {currentRoundIndex}
        </button>
        <div className="flex gap-3">
          <button
            onClick={undoLastRound}
            disabled={isPending || lastIndex === null}
            className="btn-secondary flex-1"
          >
            Annuler le dernier tour
          </button>
          <button
            onClick={finishMatch}
            disabled={isPending || rounds.length === 0}
            className="btn-primary flex-1"
          >
            Terminer la partie
          </button>
        </div>
      </div>
    </main>
  );
}
