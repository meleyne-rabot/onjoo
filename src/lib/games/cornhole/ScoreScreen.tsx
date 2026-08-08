"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AvatarBadge } from "@/components/AvatarBadge";
import { RulesButton } from "@/components/RulesButton";
import { RefreshButton } from "@/components/RefreshButton";
import { LeaderboardButton } from "@/components/LeaderboardButton";
import { useMatchPresence } from "@/hooks/useMatchPresence";
import {
  activeRoundIndex,
  DEFAULT_TARGET_SCORE,
  determineWinningSide,
  lastRoundIndexWithData,
  resolveSides,
  sideTotals,
  type Round,
  type Sides,
} from "./calc";

type Participant = {
  id: string; // match_players.id
  name: string;
  avatarColor: string;
  avatarShape: string;
};

export function CornholeScoreScreen({
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
  me: Participant | null;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { others, editorsByCell, setEditingCell } = useMatchPresence(supabase, matchId, me);
  const [rounds, setRounds] = useState<Round[]>(initialRounds);
  const [status, setStatus] = useState(initialStatus);
  const [isPending, startTransition] = useTransition();
  const [targetScore, setTargetScore] = useState(DEFAULT_TARGET_SCORE);
  const [editingTarget, setEditingTarget] = useState(false);
  const [configuredSides, setConfiguredSides] = useState<Sides | null>(null);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const bodyScrollRef = useRef<HTMLDivElement>(null);
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const totalScrollRef = useRef<HTMLDivElement>(null);

  function syncHorizontalScroll() {
    const left = bodyScrollRef.current?.scrollLeft ?? 0;
    if (headerScrollRef.current) headerScrollRef.current.scrollLeft = left;
    if (totalScrollRef.current) totalScrollRef.current.scrollLeft = left;
  }

  const participantIds = useMemo(() => participants.map((p) => p.id), [participants]);

  useEffect(() => {
    supabase
      .from("matches")
      .select("settings")
      .eq("id", matchId)
      .maybeSingle()
      .then(({ data }) => {
        const settings = data?.settings as { targetScore?: number; sides?: Sides } | null;
        if (settings?.targetScore) setTargetScore(settings.targetScore);
        if (settings?.sides) setConfiguredSides(settings.sides);
        setSettingsLoaded(true);
      });
  }, [supabase, matchId]);

  useEffect(() => {
    const channel = supabase
      .channel(`rounds-${matchId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "rounds", filter: `match_id=eq.${matchId}` },
        (payload) => {
          const row = payload.new as Round;
          setRounds((current) => (current.some((r) => r.id === row.id) ? current : [...current, row]));
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

  const isCompleted = status === "completed";
  const sides = resolveSides(participantIds, configuredSides);

  function saveTargetScore(next: number) {
    setTargetScore(next);
    setEditingTarget(false);
    startTransition(async () => {
      await supabase
        .from("matches")
        .update({ settings: { targetScore: next, sides: configuredSides } })
        .eq("id", matchId);
    });
  }

  function saveSides(next: Sides) {
    setConfiguredSides(next);
    startTransition(async () => {
      await supabase.from("matches").update({ settings: { targetScore, sides: next } }).eq("id", matchId);
    });
  }

  function saveRoundForSide(sideIndex: 0 | 1, roundIndex: number, value: number) {
    if (!sides) return;
    const otherIndex = sideIndex === 0 ? 1 : 0;
    const scoringMembers = sides[sideIndex];
    const otherMembers = sides[otherIndex];
    const otherHasEntry = otherMembers.some((mpId) =>
      rounds.some((r) => r.match_player_id === mpId && r.round_index === roundIndex),
    );
    startTransition(async () => {
      await Promise.all(
        scoringMembers.map((mpId) =>
          supabase
            .from("rounds")
            .upsert(
              { match_id: matchId, match_player_id: mpId, round_index: roundIndex, points: value, detail: {} },
              { onConflict: "match_player_id,round_index" },
            ),
        ),
      );
      if (!otherHasEntry) {
        await Promise.all(
          otherMembers.map((mpId) =>
            supabase
              .from("rounds")
              .upsert(
                { match_id: matchId, match_player_id: mpId, round_index: roundIndex, points: 0, detail: {} },
                { onConflict: "match_player_id,round_index" },
              ),
          ),
        );
      }
    });
  }

  function undoLastRound(lastIndex: number) {
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

  function finishMatch(totals: [number, number]) {
    if (!sides) return;
    const winningSide = determineWinningSide(totals, targetScore);
    startTransition(async () => {
      await Promise.all(
        participants.map((participant) => {
          const sideIndex = sides[0].includes(participant.id) ? 0 : 1;
          return supabase
            .from("match_players")
            .update({
              final_score: totals[sideIndex] ?? 0,
              is_winner: winningSide === sideIndex,
            })
            .eq("id", participant.id);
        }),
      );
      await supabase
        .from("matches")
        .update({ status: "completed", played_at: new Date().toISOString() })
        .eq("id", matchId);

      setStatus("completed");
    });
  }

  if (!settingsLoaded) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 px-4 py-8 sm:px-6">
        <p className="font-quicksand text-sm text-[#777]">Chargement…</p>
      </main>
    );
  }

  if (participantIds.length < 2) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 px-4 py-8 sm:px-6">
        <p className="font-quicksand text-sm text-[#777]">
          Le Cornhole se joue à au moins 2 joueurs.
        </p>
      </main>
    );
  }

  if (!sides) {
    return (
      <TeamSetup participants={participants} onConfirm={saveSides} />
    );
  }

  const sideViews: [SideView, SideView] = [
    { members: participants.filter((p) => sides[0].includes(p.id)) },
    { members: participants.filter((p) => sides[1].includes(p.id)) },
  ];
  const totals = sideTotals(rounds, sides);
  const activeRound = activeRoundIndex(rounds, sides);
  const lastIndex = lastRoundIndexWithData(rounds);
  const winningSide = isCompleted ? determineWinningSide(totals, targetScore) : null;

  const roundIndices = isCompleted
    ? Array.from(new Set(rounds.map((r) => r.round_index))).sort((a, b) => a - b)
    : Array.from({ length: activeRound }, (_, i) => i + 1);
  const gridTemplateColumns = `52px repeat(2, minmax(120px, 1fr))`;

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 px-4 py-8 sm:px-6">
      {isCompleted && winningSide !== null && (
        <div className="card flex flex-col items-center gap-2 text-center">
          <p className="text-4xl">🎉</p>
          <h1 className="font-fredoka text-2xl font-bold text-onjoo-green-900">Victoire !</h1>
          <div className="flex flex-wrap justify-center gap-4">
            {sideViews[winningSide].members.map((p) => (
              <div key={p.id} className="flex flex-col items-center gap-1">
                <AvatarBadge color={p.avatarColor} shape={p.avatarShape} size={44} />
                <span className="font-fredoka text-sm font-semibold text-onjoo-green-900">
                  {p.name}
                </span>
              </div>
            ))}
          </div>
          <span className="badge">{totals[winningSide]} pts</span>
          <button onClick={() => router.push(`/games/${gameCode}`)} className="btn-primary mt-2">
            Voir l&apos;historique
          </button>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <RulesButton gameCode="cornhole" gameName="Cornhole" />
          <RefreshButton />
          {!isCompleted && rounds.length > 0 && (
            <LeaderboardButton
              entries={sideViews.map((side, index) => ({
                id: `side-${index}`,
                name: side.members.map((p) => p.name).join(" & "),
                avatarColor: side.members[0]?.avatarColor ?? "#999",
                avatarShape: side.members[0]?.avatarShape ?? "circle",
                score: totals[index],
              }))}
            />
          )}
          <div>
            <h1 className="font-fredoka text-xl font-bold text-onjoo-green-900">Cornhole</h1>
            {!isCompleted && (
              <p className="font-quicksand text-sm text-[#777]">
                Saisis l&apos;écart déjà annulé dans la case du camp qui a marqué ce tour.
              </p>
            )}
          </div>
        </div>
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
      </div>

      {!isCompleted && (
        <div className="flex items-center gap-2">
          <span className="font-quicksand text-xs text-[#777]">Score cible :</span>
          {editingTarget ? (
            <TargetScoreEditor initial={targetScore} onCancel={() => setEditingTarget(false)} onSave={saveTargetScore} />
          ) : (
            <button
              type="button"
              onClick={() => setEditingTarget(true)}
              className="rounded-full border-2 border-[#ddd] px-2.5 py-1 font-quicksand text-xs font-bold text-onjoo-green-900"
            >
              {targetScore} pts ✎
            </button>
          )}
        </div>
      )}

      <div className="rounded-xl border border-[#eee]">
        <div ref={headerScrollRef} className="sticky top-0 z-20 overflow-x-hidden rounded-t-xl bg-[#FAF1DE]">
          <div className="grid" style={{ gridTemplateColumns }}>
            <div />
            {sideViews.map((side, sideIndex) => (
              <div key={sideIndex} className="flex flex-col items-center gap-1 px-1 py-2.5">
                <div className="flex -space-x-2">
                  {side.members.map((p) => (
                    <AvatarBadge key={p.id} color={p.avatarColor} shape={p.avatarShape} size={32} />
                  ))}
                </div>
                <span className="truncate font-quicksand text-sm font-bold text-onjoo-green-900">
                  {side.members.map((p) => p.name).join(" & ")}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div ref={bodyScrollRef} onScroll={syncHorizontalScroll} className="overflow-x-auto">
          <div className="grid gap-px bg-[#eee]" style={{ gridTemplateColumns }}>
            {roundIndices.map((roundIndex) => (
              <RoundRow
                key={roundIndex}
                roundIndex={roundIndex}
                isActive={!isCompleted && roundIndex === activeRound}
                disabled={isCompleted}
                sideViews={sideViews}
                rounds={rounds}
                onSave={saveRoundForSide}
                editorsByCell={editorsByCell}
                onFocusCell={setEditingCell}
              />
            ))}
          </div>
        </div>

        <div ref={totalScrollRef} className="sticky bottom-0 z-20 overflow-x-hidden rounded-b-xl bg-[#FAF1DE]">
          <div className="grid" style={{ gridTemplateColumns }}>
            <div className="flex items-center justify-center px-1 py-2.5 font-fredoka text-sm font-bold text-onjoo-green-900">
              Total
            </div>
            {[0, 1].map((sideIndex) => (
              <div key={sideIndex} className="flex flex-col items-center justify-center gap-0.5 px-1 py-2.5">
                <span className="font-fredoka text-lg font-bold text-onjoo-green-900">
                  {totals[sideIndex]}
                </span>
                {totals[sideIndex] >= targetScore && (
                  <span className="font-quicksand text-[10px] font-bold text-onjoo-green-900">
                    {targetScore}+
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
              onClick={() => lastIndex !== null && undoLastRound(lastIndex)}
              disabled={isPending || lastIndex === null}
              className="font-quicksand text-xs font-semibold text-[#999] underline disabled:opacity-40"
            >
              Annuler le dernier tour
            </button>
          </div>

          <button
            onClick={() => finishMatch(totals)}
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

type SideView = { members: Participant[] };

function TeamSetup({
  participants,
  onConfirm,
}: {
  participants: Participant[];
  onConfirm: (sides: Sides) => void;
}) {
  const half = Math.ceil(participants.length / 2);
  const [assignment, setAssignment] = useState<Record<string, 0 | 1>>(() => {
    const initial: Record<string, 0 | 1> = {};
    participants.forEach((p, i) => {
      initial[p.id] = i < half ? 0 : 1;
    });
    return initial;
  });

  const sideA = participants.filter((p) => assignment[p.id] === 0);
  const sideB = participants.filter((p) => assignment[p.id] === 1);
  const canConfirm = sideA.length > 0 && sideB.length > 0;

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="font-fredoka text-2xl font-bold text-onjoo-green-900">Formez les 2 camps</h1>
        <p className="font-quicksand text-sm text-[#777]">
          Le Cornhole se joue à 2 camps (1 ou 2 joueurs chacun). Tape sur un joueur pour changer son camp.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <TeamColumn label="Camp A" members={sideA} />
        <TeamColumn label="Camp B" members={sideB} />
      </div>
      <div className="flex flex-col gap-2">
        {participants.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() =>
              setAssignment((current) => ({ ...current, [p.id]: current[p.id] === 0 ? 1 : 0 }))
            }
            className="card flex items-center gap-3"
          >
            <AvatarBadge color={p.avatarColor} shape={p.avatarShape} size={32} />
            <span className="flex-1 text-left font-quicksand text-base font-medium text-onjoo-green-900">
              {p.name}
            </span>
            <span className="badge">{assignment[p.id] === 0 ? "Camp A" : "Camp B"}</span>
          </button>
        ))}
      </div>
      <button
        type="button"
        disabled={!canConfirm}
        onClick={() => onConfirm([sideA.map((p) => p.id), sideB.map((p) => p.id)])}
        className="btn-primary disabled:opacity-40"
      >
        Confirmer les camps
      </button>
    </main>
  );
}

function TeamColumn({ label, members }: { label: string; members: Participant[] }) {
  return (
    <div className="card flex flex-col items-center gap-2">
      <span className="font-fredoka text-sm font-bold text-onjoo-green-900">{label}</span>
      <div className="flex -space-x-2">
        {members.map((p) => (
          <AvatarBadge key={p.id} color={p.avatarColor} shape={p.avatarShape} size={32} />
        ))}
      </div>
      {members.length === 0 && <span className="font-quicksand text-xs text-[#999]">Vide</span>}
    </div>
  );
}

function TargetScoreEditor({
  initial,
  onCancel,
  onSave,
}: {
  initial: number;
  onCancel: () => void;
  onSave: (value: number) => void;
}) {
  const [value, setValue] = useState(String(initial));

  return (
    <div className="flex items-center gap-1.5">
      <input
        type="number"
        inputMode="numeric"
        autoFocus
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className="input-field h-8 w-20 px-2 py-1 text-sm"
      />
      <button
        type="button"
        onClick={() => onSave(Number(value) || DEFAULT_TARGET_SCORE)}
        className="rounded-full bg-onjoo-green-900 px-2.5 py-1 font-quicksand text-xs font-bold text-white"
      >
        OK
      </button>
      <button type="button" onClick={onCancel} className="font-quicksand text-xs font-semibold text-[#999]">
        Annuler
      </button>
    </div>
  );
}

function RoundRow({
  roundIndex,
  isActive,
  disabled,
  sideViews,
  rounds,
  onSave,
  editorsByCell,
  onFocusCell,
}: {
  roundIndex: number;
  isActive: boolean;
  disabled: boolean;
  sideViews: [SideView, SideView];
  rounds: Round[];
  onSave: (sideIndex: 0 | 1, roundIndex: number, points: number) => void;
  editorsByCell: Map<string, { avatarColor: string }>;
  onFocusCell: (cell: string | null) => void;
}) {
  return (
    <>
      <div className="sticky left-0 z-10 flex items-center justify-center bg-white px-1 py-2 font-quicksand text-sm font-bold text-[#999]">
        T{roundIndex}
      </div>
      {([0, 1] as const).map((sideIndex) => {
        const representative = sideViews[sideIndex].members[0];
        const round = representative
          ? rounds.find((r) => r.match_player_id === representative.id && r.round_index === roundIndex)
          : undefined;
        const cellKey = `side-${sideIndex}:${roundIndex}`;
        const editor = editorsByCell.get(cellKey);
        return (
          <div key={sideIndex} className="flex items-center justify-center bg-white px-1 py-2">
            <ScoreCell
              key={round ? `${round.id}-${round.points}` : "empty"}
              round={round}
              sideName={sideViews[sideIndex].members.map((p) => p.name).join(" & ")}
              highlighted={isActive}
              disabled={disabled}
              editingColor={editor?.avatarColor}
              onSave={(points) => onSave(sideIndex, roundIndex, points)}
              onFocusCell={() => onFocusCell(cellKey)}
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
  sideName,
  highlighted,
  disabled,
  editingColor,
  onSave,
  onFocusCell,
  onBlurCell,
}: {
  round: Round | undefined;
  sideName: string;
  highlighted: boolean;
  disabled: boolean;
  editingColor: string | undefined;
  onSave: (points: number) => void;
  onFocusCell: () => void;
  onBlurCell: () => void;
}) {
  const [value, setValue] = useState(round ? String(round.points) : "");
  const [focused, setFocused] = useState(false);

  function commit() {
    if (value === "" || disabled) return;
    onSave(Math.max(0, Number(value) || 0));
  }

  return (
    <div className="relative flex items-center justify-center">
      {focused && (
        <span
          className="absolute bottom-full z-30 mb-1 whitespace-nowrap rounded-full px-2.5 py-1 font-quicksand text-xs font-bold text-white"
          style={{ background: "#163D2E" }}
        >
          {sideName}
        </span>
      )}
      <input
        type="number"
        inputMode="numeric"
        min={0}
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
        className={`h-11 w-16 rounded-lg border text-center font-quicksand text-lg font-bold text-onjoo-green-900 focus:outline-none disabled:opacity-70 ${editingColor ? "animate-pulse" : ""}`}
        style={{
          borderWidth: highlighted || editingColor ? 2 : 1,
          borderColor: editingColor ?? (highlighted ? "#163D2E" : "#ddd"),
        }}
      />
    </div>
  );
}
