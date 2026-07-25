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

type PlayerLite = {
  id: string;
  name: string;
  avatar_color: string;
  avatar_shape: string;
};

export function QwirkleScoreScreen({
  matchId,
  players,
  initialRounds,
  initialStatus,
}: {
  matchId: string;
  players: PlayerLite[];
  initialRounds: Round[];
  initialStatus: "in_progress" | "completed";
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [rounds, setRounds] = useState<Round[]>(initialRounds);
  const [status, setStatus] = useState(initialStatus);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  const playerIds = useMemo(() => players.map((p) => p.id), [players]);

  const [winners, setWinners] = useState<string[] | null>(
    initialStatus === "completed"
      ? determineWinners(cumulativeTotals(initialRounds, playerIds))
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

  const totals = cumulativeTotals(rounds, playerIds);
  const qwirkleCounts = estimatedQwirkleCounts(rounds, playerIds);
  const matchTotal = totalMatchPoints(rounds);
  const currentRoundIndex = nextRoundIndex(rounds);
  const lastIndex = lastRoundIndex(rounds);

  function submitRound() {
    const rows = players.map((player) => ({
      match_id: matchId,
      player_id: player.id,
      round_index: currentRoundIndex,
      points: Number(inputs[player.id] ?? 0) || 0,
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
        players.map((player) =>
          supabase
            .from("match_players")
            .update({
              final_score: totals[player.id] ?? 0,
              is_winner: finalWinners.includes(player.id),
            })
            .eq("match_id", matchId)
            .eq("player_id", player.id),
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
        <h1 className="text-3xl font-bold">
          {winners.length > 1 ? "Égalité !" : "Victoire !"}
        </h1>
        <div className="flex flex-wrap justify-center gap-6">
          {players
            .filter((p) => winners.includes(p.id))
            .map((p) => (
              <div key={p.id} className="flex flex-col items-center gap-2">
                <AvatarBadge color={p.avatar_color} shape={p.avatar_shape} size={64} />
                <span className="text-lg font-semibold">{p.name}</span>
                <span className="text-neutral-500">{totals[p.id]} points</span>
              </div>
            ))}
        </div>
        <p className="text-neutral-500">
          Total de points de la partie : {matchTotal}
        </p>
        <button
          onClick={() => router.push("/matches")}
          className="rounded-xl bg-neutral-900 px-6 py-3 text-lg font-medium text-white"
        >
          Voir l&apos;historique
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col gap-6 px-6 py-8">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Qwirkle — Tour {currentRoundIndex}</h1>
        <span className="rounded-full bg-neutral-100 px-3 py-1 text-sm text-neutral-600">
          Total partie : {matchTotal}
        </span>
      </header>

      <section className="flex flex-col gap-4">
        {players.map((player) => (
          <div
            key={player.id}
            className="flex items-center gap-4 rounded-xl border border-neutral-200 p-4"
          >
            <AvatarBadge color={player.avatar_color} shape={player.avatar_shape} />
            <div className="flex flex-1 flex-col">
              <span className="text-lg font-medium">{player.name}</span>
              <span className="text-sm text-neutral-500">
                Total : {totals[player.id] ?? 0}
                {(qwirkleCounts[player.id] ?? 0) > 0 &&
                  ` · ${qwirkleCounts[player.id]} Qwirkle${
                    qwirkleCounts[player.id] > 1 ? "s" : ""
                  } probable${qwirkleCounts[player.id] > 1 ? "s" : ""}`}
              </span>
            </div>
            <input
              type="number"
              inputMode="numeric"
              value={inputs[player.id] ?? ""}
              onChange={(event) =>
                setInputs((current) => ({
                  ...current,
                  [player.id]: event.target.value,
                }))
              }
              placeholder="0"
              className="w-20 rounded-xl border border-neutral-300 px-3 py-3 text-center text-xl"
            />
          </div>
        ))}
      </section>

      <div className="flex flex-col gap-3">
        <button
          onClick={submitRound}
          disabled={isPending}
          className="rounded-xl bg-neutral-900 px-4 py-4 text-lg font-semibold text-white disabled:opacity-50"
        >
          Valider le tour
        </button>
        <div className="flex gap-3">
          <button
            onClick={undoLastRound}
            disabled={isPending || lastIndex === null}
            className="flex-1 rounded-xl border border-neutral-300 px-4 py-3 font-medium disabled:opacity-40"
          >
            Annuler le dernier tour
          </button>
          <button
            onClick={finishMatch}
            disabled={isPending || rounds.length === 0}
            className="flex-1 rounded-xl bg-emerald-600 px-4 py-3 font-medium text-white disabled:opacity-40"
          >
            Terminer la partie
          </button>
        </div>
      </div>
    </main>
  );
}
