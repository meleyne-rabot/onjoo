"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AvatarBadge } from "@/components/AvatarBadge";
import { RulesButton } from "@/components/RulesButton";
import {
  CATEGORIES,
  categoryOptions,
  categorySublabel,
  cumulativeTotals,
  DEFAULT_SETTINGS,
  determineWinners,
  UPPER_FACE,
  upperBonus,
  upperSubtotal,
  type Category,
  type PillOption,
  type Round,
  type RoundDetail,
} from "./calc";

type Participant = {
  id: string; // match_players.id
  name: string;
  avatarColor: string;
  avatarShape: string;
};

// Une seule case ouverte à la fois (joueur + catégorie) — le panneau
// s'affiche en pleine largeur juste sous la ligne concernée.
type OpenCell = { participantId: string; categoryIndex: number };

export function YamsScoreScreen({
  matchId,
  gameCode,
  participants,
  initialRounds,
  initialStatus,
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
  const [rounds, setRounds] = useState<Round[]>(initialRounds);
  const [status, setStatus] = useState(initialStatus);
  const [isPending, startTransition] = useTransition();
  const [openCell, setOpenCell] = useState<OpenCell | null>(null);
  // Cf. Qwirkle/Skyjo/Flip 7 : le conteneur à défilement horizontal
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

  const participantIds = useMemo(() => participants.map((p) => p.id), [participants]);

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

  const totals = cumulativeTotals(rounds, participantIds, DEFAULT_SETTINGS);
  const matchTotal = Object.values(totals).reduce((sum, v) => sum + v, 0);
  const isCompleted = status === "completed";
  const winners = isCompleted ? determineWinners(totals) : [];
  const winnerPoints = winners.length > 0 ? totals[winners[0]] ?? 0 : 0;

  function saveCell(matchPlayerId: string, roundIndex: number, points: number, detail: RoundDetail) {
    startTransition(async () => {
      const { error } = await supabase.from("rounds").upsert(
        { match_id: matchId, match_player_id: matchPlayerId, round_index: roundIndex, points, detail },
        { onConflict: "match_player_id,round_index" },
      );
      if (error) console.error("saveCell failed:", error.message);
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

  const gridTemplateColumns = `76px repeat(${participants.length}, minmax(84px, 1fr))`;

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
          <button onClick={() => router.push(`/games/${gameCode}`)} className="btn-primary mt-2">
            Voir l&apos;historique
          </button>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <RulesButton gameCode="yams" gameName="Yam's" />
          <div>
            <h1 className="font-fredoka text-xl font-bold text-onjoo-green-900">Yam&apos;s</h1>
            {!isCompleted && (
              <p className="font-quicksand text-sm text-[#777]">
                Tape une case pour choisir ton score.
              </p>
            )}
          </div>
        </div>
        <span className="badge">Total partie : {matchTotal}</span>
      </div>

      <div className="rounded-xl border border-[#eee]">
        <div ref={headerScrollRef} className="sticky top-0 z-20 overflow-x-hidden rounded-t-xl bg-[#FAF1DE]">
          <div className="grid" style={{ gridTemplateColumns }}>
            <div />
            {participants.map((participant) => (
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
            {CATEGORIES.filter((c) => c.section === "upper").map((category) => (
              <CategoryRow
                key={category.id}
                category={category}
                disabled={isCompleted}
                participants={participants}
                rounds={rounds}
                openCell={openCell}
                setOpenCell={setOpenCell}
                onSave={saveCell}
              />
            ))}
            <SubtotalRows rounds={rounds} participants={participants} />
            {CATEGORIES.filter((c) => c.section === "lower").map((category) => (
              <CategoryRow
                key={category.id}
                category={category}
                disabled={isCompleted}
                participants={participants}
                rounds={rounds}
                openCell={openCell}
                setOpenCell={setOpenCell}
                onSave={saveCell}
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
            {participants.map((participant) => (
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
          <div className="flex items-center gap-2 font-quicksand text-xs text-onjoo-sage-500">
            <span className="h-1.5 w-1.5 rounded-full bg-onjoo-sage-500" />
            Enregistré automatiquement
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

function CategoryLabel({ category }: { category: Category }) {
  const face = UPPER_FACE[category.id];
  let icon: React.ReactNode = null;
  if (face !== undefined) icon = <DiePips face={face} />;
  else if (category.id === "brelan") icon = <BrelanIcon />;
  else if (category.id === "carre") icon = <CarreIcon />;

  if (!icon) {
    return (
      <span className="font-quicksand text-xs font-bold text-onjoo-green-900">{category.label}</span>
    );
  }
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#FAF1DE]">
        {icon}
      </div>
      <span className="font-quicksand text-[11px] font-bold text-onjoo-green-900">
        {category.label}
      </span>
    </div>
  );
}

function CategoryRow({
  category,
  disabled,
  participants,
  rounds,
  openCell,
  setOpenCell,
  onSave,
}: {
  category: Category;
  disabled: boolean;
  participants: Participant[];
  rounds: Round[];
  openCell: OpenCell | null;
  setOpenCell: (cell: OpenCell | null) => void;
  onSave: (matchPlayerId: string, roundIndex: number, points: number, detail: RoundDetail) => void;
}) {
  const options = categoryOptions(category.id);
  const sublabel = categorySublabel(category.id);
  const isOpenHere = openCell?.categoryIndex === category.index;
  const openParticipant = isOpenHere
    ? participants.find((p) => p.id === openCell?.participantId)
    : undefined;
  const openRound = openParticipant
    ? rounds.find(
        (r) => r.match_player_id === openParticipant.id && r.round_index === category.index,
      )
    : undefined;

  return (
    <>
      <div className="sticky left-0 z-10 flex items-center border-b border-[#f0ede3] bg-white px-2 py-2">
        <CategoryLabel category={category} />
      </div>
      {participants.map((participant) => {
        const round = rounds.find(
          (r) => r.match_player_id === participant.id && r.round_index === category.index,
        );
        const isThisOpen = isOpenHere && openCell?.participantId === participant.id;
        return (
          <div
            key={participant.id}
            className="flex items-center justify-center border-b border-[#f0ede3] bg-white px-1 py-2"
          >
            {options ? (
              <button
                type="button"
                disabled={disabled}
                onClick={() =>
                  setOpenCell(isThisOpen ? null : { participantId: participant.id, categoryIndex: category.index })
                }
                className="flex h-7 w-9 items-center justify-center rounded-lg font-quicksand text-xs font-bold"
                style={{
                  border: round ? "2px solid #163D2E" : "1px solid #ddd",
                  color: round ? "#163D2E" : "#bbb",
                  background: isThisOpen ? "#FAF1DE" : "transparent",
                }}
              >
                {round ? round.points : "–"}
              </button>
            ) : (
              <ScoreCell
                key={round ? `${round.id}-${round.points}` : "empty"}
                round={round}
                participantName={participant.name}
                disabled={disabled}
                onSave={(points, detail) => onSave(participant.id, category.index, points, detail)}
              />
            )}
          </div>
        );
      })}

      {options && isOpenHere && openParticipant && (
        <div
          className="border-b border-[#f0ede3] bg-white px-3 py-3 shadow-[inset_0_2px_6px_rgba(0,0,0,0.04)]"
          style={{ gridColumn: "1 / -1" }}
        >
          <p className="mb-2 text-center font-quicksand text-[11px] text-[#999]">
            {openParticipant.name} · {category.label}
            {sublabel ? ` (${sublabel})` : ""}
          </p>
          <PillGrid
            options={options}
            current={openRound?.points}
            onSelect={(value) => {
              onSave(openParticipant.id, category.index, value, {});
              setOpenCell(null);
            }}
          />
        </div>
      )}
    </>
  );
}

function PillGrid({
  options,
  current,
  onSelect,
}: {
  options: PillOption[];
  current: number | undefined;
  onSelect: (value: number) => void;
}) {
  const hasSublabels = options.some((o) => o.sublabel);
  const columns = hasSublabels ? Math.min(options.length, 3) : options.length > 6 ? 4 : options.length;

  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
      {options.map((option) => {
        const active = current === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onSelect(option.value)}
            className="flex flex-col items-center justify-center gap-0.5 rounded-lg py-2.5 font-fredoka text-sm font-bold"
            style={{
              background: active ? "#163D2E" : "#FAF1DE",
              color: active ? "#fff" : "#163D2E",
            }}
          >
            {option.label}
            {option.sublabel && (
              <span
                className="font-quicksand text-[8px] font-normal"
                style={{ color: active ? "#cfd8d1" : "#999" }}
              >
                {option.sublabel}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function SubtotalRows({
  rounds,
  participants,
}: {
  rounds: Round[];
  participants: Participant[];
}) {
  return (
    <>
      <div className="sticky left-0 z-10 flex items-center bg-[#FAF1DE] px-2 py-2 font-quicksand text-[10px] font-bold uppercase text-[#8a8370]">
        Sous-total
      </div>
      {participants.map((participant) => (
        <div
          key={participant.id}
          className="flex items-center justify-center bg-[#FAF1DE] px-1 py-2 font-quicksand text-sm font-bold text-onjoo-green-900"
        >
          {upperSubtotal(rounds, participant.id)}
        </div>
      ))}
      <div className="sticky left-0 z-10 flex items-center bg-[#FAF1DE] px-2 pt-2 font-quicksand text-[10px] font-bold uppercase text-[#8a8370]">
        Bonus ({DEFAULT_SETTINGS.bonusThreshold}+)
      </div>
      {participants.map((participant) => {
        const subtotal = upperSubtotal(rounds, participant.id);
        const bonus = upperBonus(subtotal, DEFAULT_SETTINGS);
        return (
          <div
            key={participant.id}
            className="flex items-center justify-center bg-[#FAF1DE] px-1 pt-2 font-quicksand text-sm font-bold"
            style={{ color: bonus > 0 ? "#163D2E" : "#bbb" }}
          >
            {bonus > 0 ? `+${bonus}` : "–"}
          </div>
        );
      })}
      <div className="sticky left-0 z-10 border-b border-[#ece5d3] bg-[#FAF1DE] px-2 pb-2" />
      {participants.map((participant) => {
        const subtotal = upperSubtotal(rounds, participant.id);
        const bonus = upperBonus(subtotal, DEFAULT_SETTINGS);
        const remaining = DEFAULT_SETTINGS.bonusThreshold - subtotal;
        return (
          <div
            key={participant.id}
            className="flex items-center justify-center border-b border-[#ece5d3] bg-[#FAF1DE] px-1 pb-2 text-center font-quicksand text-[9px]"
            style={{ color: "#b3ab95" }}
          >
            {bonus > 0 ? "" : `encore ${remaining} pts`}
          </div>
        );
      })}
    </>
  );
}

function DiePips({ face }: { face: number }) {
  const positions: Record<number, [number, number][]> = {
    1: [[2, 2]],
    2: [
      [1, 1],
      [3, 3],
    ],
    3: [
      [1, 1],
      [2, 2],
      [3, 3],
    ],
    4: [
      [1, 1],
      [3, 1],
      [1, 3],
      [3, 3],
    ],
    5: [
      [1, 1],
      [3, 1],
      [2, 2],
      [1, 3],
      [3, 3],
    ],
    6: [
      [1, 1],
      [3, 1],
      [1, 2],
      [3, 2],
      [1, 3],
      [3, 3],
    ],
  };
  const pips = positions[face] ?? [];
  return (
    <div
      className="grid"
      style={{ gridTemplateColumns: "repeat(3,1fr)", gridTemplateRows: "repeat(3,1fr)", width: 16, height: 16 }}
    >
      {pips.map(([col, row], i) => (
        <div
          key={i}
          style={{
            gridColumn: col,
            gridRow: row,
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: "#163D2E",
            justifySelf: "center",
            alignSelf: "center",
          }}
        />
      ))}
    </div>
  );
}

function BrelanIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 100 100">
      <rect x="8" y="8" width="34" height="34" rx="6" fill="#163D2E" />
      <rect x="34" y="34" width="34" height="34" rx="6" fill="#163D2E" opacity="0.6" />
      <rect x="58" y="58" width="34" height="34" rx="6" fill="#163D2E" opacity="0.35" />
    </svg>
  );
}

function CarreIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 100 100">
      <rect x="6" y="6" width="40" height="40" rx="6" fill="#163D2E" />
      <rect x="54" y="6" width="40" height="40" rx="6" fill="#163D2E" opacity="0.7" />
      <rect x="6" y="54" width="40" height="40" rx="6" fill="#163D2E" opacity="0.45" />
      <rect x="54" y="54" width="40" height="40" rx="6" fill="#163D2E" opacity="0.25" />
    </svg>
  );
}

function ScoreCell({
  round,
  participantName,
  disabled,
  onSave,
}: {
  round: Round | undefined;
  participantName: string;
  disabled: boolean;
  onSave: (points: number, detail: RoundDetail) => void;
}) {
  const [value, setValue] = useState(round ? String(round.points) : "");
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
        className="h-9 w-11 rounded-lg border text-center font-quicksand text-sm font-bold text-onjoo-green-900 focus:outline-none disabled:opacity-70"
        style={{ borderWidth: 1, borderColor: "#ddd" }}
      />
    </div>
  );
}
