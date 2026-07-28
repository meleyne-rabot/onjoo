"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AvatarBadge } from "@/components/AvatarBadge";
import { RulesButton } from "@/components/RulesButton";
import {
  bidOrderForRound,
  buildRoundPlan,
  cumulativeTotals,
  determineWinners,
  isRoundComplete,
  roundHasAnyData,
  roundScore,
  totalBids,
  type Round,
  type RoundDetail,
  type RoundPlan,
} from "./calc";

type Participant = {
  id: string; // match_players.id
  name: string;
  avatarColor: string;
  avatarShape: string;
};

function ordinal(n: number): string {
  return n === 1 ? "1er" : `${n}e`;
}

// Fusionne par (match_player_id, round_index) plutôt que par id : une
// mise à jour optimiste locale (id provisoire) et l'écho realtime qui
// arrive ensuite avec le vrai id doivent se réconcilier sur la même
// ligne, sinon on se retrouve avec un doublon et un total figé sur
// l'ancienne valeur tant que l'écho n'est pas arrivé.
function mergeRound(current: Round[], incoming: Round): Round[] {
  const idx = current.findIndex(
    (r) => r.match_player_id === incoming.match_player_id && r.round_index === incoming.round_index,
  );
  if (idx === -1) return [...current, incoming];
  const next = [...current];
  next[idx] = incoming;
  return next;
}

export function AscenseurScoreScreen({
  matchId,
  gameCode,
  participants,
  initialRounds,
  initialStatus,
  initialTurnOrderSet,
}: {
  matchId: string;
  leagueId: string;
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
  // Au tour actif s'ajoute au plus un tour "déplié" pour relecture/
  // correction (choisi via le bandeau récapitulatif) — les autres tours
  // passés restent repliés pour ne pas devenir ingérable à 15+ tours.
  const [expandedRoundIndex, setExpandedRoundIndex] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();
  // Cf. Qwirkle/Skyjo/Flip 7/Yams : le conteneur à défilement horizontal
  // devient malgré lui aussi la référence de défilement vertical, donc
  // en-tête et total sont dans leurs propres conteneurs synchronisés.
  const bodyScrollRef = useRef<HTMLDivElement>(null);
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const totalScrollRef = useRef<HTMLDivElement>(null);

  function syncHorizontalScroll() {
    const left = bodyScrollRef.current?.scrollLeft ?? 0;
    if (headerScrollRef.current) headerScrollRef.current.scrollLeft = left;
    if (totalScrollRef.current) totalScrollRef.current.scrollLeft = left;
  }

  const orderedParticipants = useMemo(() => {
    if (!turnOrderIds) return participants;
    const byId = new Map(participants.map((p) => [p.id, p]));
    return turnOrderIds.map((id) => byId.get(id)).filter((p): p is Participant => Boolean(p));
  }, [participants, turnOrderIds]);

  const participantIds = useMemo(() => orderedParticipants.map((p) => p.id), [orderedParticipants]);

  useEffect(() => {
    const channel = supabase
      .channel(`rounds-${matchId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "rounds", filter: `match_id=eq.${matchId}` },
        (payload) => {
          const row = payload.new as Round;
          setRounds((current) => mergeRound(current, row));
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rounds", filter: `match_id=eq.${matchId}` },
        (payload) => {
          const row = payload.new as Round;
          setRounds((current) => mergeRound(current, row));
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

  const roundPlan = useMemo(() => buildRoundPlan(participantIds.length), [participantIds.length]);
  const isCompleted = status === "completed";

  const activeRoundIndex = useMemo(() => {
    for (const r of roundPlan) {
      if (!isRoundComplete(rounds, r.index, participantIds)) return r.index;
    }
    return roundPlan[roundPlan.length - 1]?.index ?? 1;
  }, [roundPlan, rounds, participantIds]);

  // Le tour actif reste toujours ouvert, ainsi que tout tour INCOMPLET
  // qui a déjà une donnée (pari posé à l'avance mais réalisé pas encore
  // rempli, par ex.) — sinon ça disparaîtrait de l'écran au rechargement
  // sans être perdu en base (ce qui est arrivé). Dès qu'un tour est
  // complet (réalisé rempli pour tout le monde), il se replie comme
  // prévu — sinon plus aucun tour ne se repliait jamais.
  const visibleRounds = isCompleted
    ? roundPlan
    : roundPlan.filter(
        (r) =>
          r.index === activeRoundIndex ||
          r.index === expandedRoundIndex ||
          (roundHasAnyData(rounds, r.index) && !isRoundComplete(rounds, r.index, participantIds)),
      );

  const totals = cumulativeTotals(rounds, participantIds);
  const matchTotal = Object.values(totals).reduce((sum, v) => sum + v, 0);
  const winners = isCompleted ? determineWinners(totals) : [];
  const winnerPoints = winners.length > 0 ? totals[winners[0]] ?? 0 : 0;
  const lastRoundIndex = rounds.length > 0 ? Math.max(...rounds.map((r) => r.round_index)) : null;

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

  function saveBid(matchPlayerId: string, roundIndex: number, bid: number) {
    const existing = rounds.find(
      (r) => r.match_player_id === matchPlayerId && r.round_index === roundIndex,
    );
    const detail: RoundDetail = { ...existing?.detail, bid };
    const points = existing?.detail?.actual ?? 0;
    // Mise à jour optimiste immédiate : sans ça, l'indicateur "somme des
    // paris" et l'alerte restent figés sur l'ancienne valeur tant que
    // l'écho realtime n'est pas revenu (latence perceptible, voire
    // bloquant si l'écho tarde).
    setRounds((current) =>
      mergeRound(current, {
        id: existing?.id ?? `optimistic-${matchPlayerId}-${roundIndex}`,
        match_player_id: matchPlayerId,
        round_index: roundIndex,
        points,
        detail,
      }),
    );
    startTransition(async () => {
      const { error } = await supabase.from("rounds").upsert(
        { match_id: matchId, match_player_id: matchPlayerId, round_index: roundIndex, points, detail },
        { onConflict: "match_player_id,round_index" },
      );
      if (error) console.error("saveBid failed:", error.message);
    });
  }

  function saveActual(matchPlayerId: string, roundIndex: number, actual: number) {
    const existing = rounds.find(
      (r) => r.match_player_id === matchPlayerId && r.round_index === roundIndex,
    );
    const detail: RoundDetail = { ...existing?.detail, actual };
    setRounds((current) =>
      mergeRound(current, {
        id: existing?.id ?? `optimistic-${matchPlayerId}-${roundIndex}`,
        match_player_id: matchPlayerId,
        round_index: roundIndex,
        points: actual,
        detail,
      }),
    );
    startTransition(async () => {
      const { error } = await supabase.from("rounds").upsert(
        { match_id: matchId, match_player_id: matchPlayerId, round_index: roundIndex, points: actual, detail },
        { onConflict: "match_player_id,round_index" },
      );
      if (error) console.error("saveActual failed:", error.message);
    });
  }

  function undoLastRound() {
    if (lastRoundIndex === null) return;
    startTransition(async () => {
      await supabase.from("rounds").delete().eq("match_id", matchId).eq("round_index", lastRoundIndex);
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

  const gridTemplateColumns = `84px repeat(${orderedParticipants.length}, minmax(84px, 1fr))`;

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
          <button onClick={() => router.push(`/games/${gameCode}`)} className="btn-primary mt-2">
            Voir l&apos;historique
          </button>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <RulesButton gameCode="ascenseur" gameName="Ascenseur" />
          <div>
            <h1 className="font-fredoka text-xl font-bold text-onjoo-green-900">Ascenseur</h1>
            {!isCompleted && (
              <p className="font-quicksand text-sm text-[#777]">
                Annonce ton pari, puis ton réalisé une fois le tour joué.
              </p>
            )}
          </div>
        </div>
        <span className="badge">Total partie : {matchTotal}</span>
      </div>

      <RoundOverview
        roundPlan={roundPlan}
        activeRoundIndex={activeRoundIndex}
        expandedRoundIndex={expandedRoundIndex}
        isCompleted={isCompleted}
        onSelectRound={(index) =>
          setExpandedRoundIndex((current) => (current === index ? null : index))
        }
      />

      {!turnOrderSet && !isCompleted && (
        <div className="card flex flex-col gap-3">
          <span className="font-quicksand text-xs font-bold uppercase tracking-wide text-onjoo-green-900">
            Qui annonce en premier au 1er tour ?
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
          <p className="font-quicksand text-xs text-[#999]">
            L&apos;ordre tournera ensuite tout seul à chaque tour — le dernier à annoncer est désavantagé
            (la somme des paris ne peut pas être égale au nombre de cartes du tour).
          </p>
        </div>
      )}

      <div className="rounded-xl border border-[#eee]">
        <div ref={headerScrollRef} className="sticky top-0 z-20 overflow-x-hidden rounded-t-xl bg-[#FAF1DE]">
          <div className="grid" style={{ gridTemplateColumns }}>
            <div />
            {orderedParticipants.map((participant) => (
              <div key={participant.id} className="flex flex-col items-center gap-1 px-1 py-2.5">
                <AvatarBadge color={participant.avatarColor} shape={participant.avatarShape} size={28} />
                <span className="truncate font-quicksand text-xs font-bold text-onjoo-green-900">
                  {participant.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div ref={bodyScrollRef} onScroll={syncHorizontalScroll} className="overflow-x-auto">
          <div className="grid" style={{ gridTemplateColumns }}>
            {visibleRounds.map((round) => (
              <RoundBlock
                key={round.index}
                round={round}
                disabled={isCompleted}
                participants={orderedParticipants}
                bidOrder={bidOrderForRound(participantIds, round.index)}
                rounds={rounds}
                onSaveBid={saveBid}
                onSaveActual={saveActual}
              />
            ))}
          </div>
        </div>

        <div
          ref={totalScrollRef}
          className="sticky bottom-0 z-20 overflow-x-hidden rounded-b-xl bg-onjoo-green-900"
        >
          <div className="grid" style={{ gridTemplateColumns }}>
            <div className="flex items-center px-2 py-2.5 font-fredoka text-sm font-bold text-white">
              Total
            </div>
            {orderedParticipants.map((participant) => (
              <div
                key={participant.id}
                className="flex items-center justify-center px-1 py-2.5 font-fredoka text-lg font-bold text-white"
              >
                {totals[participant.id] ?? 0}
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
              disabled={isPending || lastRoundIndex === null}
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

function RoundOverview({
  roundPlan,
  activeRoundIndex,
  expandedRoundIndex,
  isCompleted,
  onSelectRound,
}: {
  roundPlan: RoundPlan[];
  activeRoundIndex: number;
  expandedRoundIndex: number | null;
  isCompleted: boolean;
  onSelectRound: (index: number) => void;
}) {
  if (roundPlan.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-xl border border-[#eee] bg-white px-3 py-2.5">
      <div className="flex items-center gap-1.5">
        {roundPlan.map((r) => {
          const isPast = isCompleted || r.index < activeRoundIndex;
          const isActive = !isCompleted && r.index === activeRoundIndex;
          const isExpanded = r.index === expandedRoundIndex;
          const label = r.hasTrump ? String(r.cards) : "SA";
          return (
            <button
              key={r.index}
              type="button"
              onClick={() => onSelectRound(r.index)}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-quicksand text-[11px] font-bold"
              style={{
                background: isActive ? "#163D2E" : isPast ? "#FAF1DE" : "#f4efe4",
                color: isActive ? "#fff" : isPast ? "#163D2E" : "#bbb",
                border: isExpanded ? "2px solid #E9A23B" : !r.hasTrump ? "2px solid #E9A23B" : "none",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RoundBlock({
  round,
  disabled,
  participants,
  bidOrder,
  rounds,
  onSaveBid,
  onSaveActual,
}: {
  round: RoundPlan;
  disabled: boolean;
  participants: Participant[];
  bidOrder: string[];
  rounds: Round[];
  onSaveBid: (matchPlayerId: string, roundIndex: number, bid: number) => void;
  onSaveActual: (matchPlayerId: string, roundIndex: number, actual: number) => void;
}) {
  const bidsIn = totalBids(rounds, round.index);
  const allBidsIn = participants.every((p) =>
    rounds.some((r) => r.match_player_id === p.id && r.round_index === round.index && r.detail?.bid !== undefined),
  );
  const forbidden = allBidsIn && bidsIn === round.cards;

  return (
    <>
      <div
        className="flex flex-wrap items-center justify-between gap-2 border-b border-[#f0ede3] bg-[#f4efe4] px-3 py-2"
        style={{ gridColumn: "1 / -1" }}
      >
        <span className="font-quicksand text-xs font-bold text-onjoo-green-900">
          {round.cards} carte{round.cards > 1 ? "s" : ""}
          {!round.hasTrump ? " SA" : ""}
        </span>
        <span
          className="font-quicksand text-[11px] font-bold"
          style={{ color: forbidden ? "#d64545" : "#999" }}
        >
          Paris : {bidsIn} / {round.cards} {forbidden ? "⚠️ interdit, à corriger" : ""}
        </span>
      </div>

      <div className="sticky left-0 z-10 flex items-center border-b border-[#f0ede3] bg-white px-2 py-1.5 font-quicksand text-xs font-bold text-[#666]">
        Pari
      </div>
      {participants.map((participant) => {
        const round_ = rounds.find(
          (r) => r.match_player_id === participant.id && r.round_index === round.index,
        );
        const position = bidOrder.indexOf(participant.id) + 1;
        const isLastBidder = position === bidOrder.length;
        return (
          <div
            key={participant.id}
            className="flex flex-col items-center gap-0.5 border-b border-[#f0ede3] bg-white px-1 py-1.5"
          >
            <span className="font-quicksand text-[9px] font-bold text-[#bbb]">{ordinal(position)}</span>
            <NumberCell
              key={round_ ? `${round_.id}-bid-${round_.detail?.bid}` : "empty"}
              value={round_?.detail?.bid}
              participantName={participant.name}
              max={round.cards}
              disabled={disabled}
              invalid={forbidden && isLastBidder}
              alertMessage={`⚠️ Total = ${round.cards}, change ton pari`}
              onSave={(value) => onSaveBid(participant.id, round.index, value)}
            />
          </div>
        );
      })}

      <div className="sticky left-0 z-10 flex items-center border-b border-[#f0ede3] bg-white px-2 py-1.5 font-quicksand text-xs font-bold text-[#666]">
        Réalisé
      </div>
      {participants.map((participant) => {
        const round_ = rounds.find(
          (r) => r.match_player_id === participant.id && r.round_index === round.index,
        );
        const score = roundScore(round_?.detail?.bid, round_?.detail?.actual);
        return (
          <div
            key={participant.id}
            className="flex flex-col items-center gap-0.5 border-b border-[#f0ede3] bg-white px-1 py-1.5"
          >
            <NumberCell
              key={round_ ? `${round_.id}-actual-${round_.detail?.actual}` : "empty"}
              value={round_?.detail?.actual}
              participantName={participant.name}
              max={round.cards}
              disabled={disabled}
              onSave={(value) => onSaveActual(participant.id, round.index, value)}
            />
            {round_?.detail?.actual !== undefined && round_?.detail?.bid !== undefined && (
              <span
                className="font-quicksand text-[9px] font-bold"
                style={{ color: score >= 0 ? "#163D2E" : "#d64545" }}
              >
                {score >= 0 ? `+${score}` : score}
              </span>
            )}
          </div>
        );
      })}
    </>
  );
}

function NumberCell({
  value,
  participantName,
  max,
  disabled,
  invalid,
  alertMessage,
  onSave,
}: {
  value: number | undefined;
  participantName: string;
  max: number;
  disabled: boolean;
  invalid?: boolean;
  alertMessage?: string;
  onSave: (value: number) => void;
}) {
  const [text, setText] = useState(value !== undefined ? String(value) : "");
  const [focused, setFocused] = useState(false);

  function commit() {
    if (text === "" || disabled) return;
    const n = Math.max(0, Math.min(max, Number(text) || 0));
    onSave(n);
  }

  const showAlert = invalid && !focused;

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
      {showAlert && alertMessage && (
        <span
          className="absolute bottom-full z-30 mb-1 whitespace-nowrap rounded-full px-2.5 py-1 font-quicksand text-[10px] font-bold text-white"
          style={{ background: "#d64545" }}
        >
          {alertMessage}
        </span>
      )}
      <input
        type="number"
        inputMode="numeric"
        min={0}
        max={max}
        value={text}
        disabled={disabled}
        onChange={(event) => setText(event.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          commit();
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            (event.target as HTMLInputElement).blur();
          }
        }}
        placeholder="–"
        className="h-9 w-11 rounded-lg border text-center font-quicksand text-sm font-bold focus:outline-none disabled:opacity-70"
        style={{
          borderWidth: invalid ? 2 : 1,
          borderColor: invalid ? "#d64545" : "#ddd",
          color: invalid ? "#d64545" : "#163D2E",
        }}
      />
    </div>
  );
}
