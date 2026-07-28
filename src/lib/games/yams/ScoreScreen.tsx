"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AvatarBadge } from "@/components/AvatarBadge";
import { RulesButton } from "@/components/RulesButton";
import {
  CATEGORIES,
  cumulativeTotals,
  DEFAULT_SETTINGS,
  determineWinners,
  upperBonus,
  upperSubtotal,
  type Round,
  type RoundDetail,
  type YamsSettings,
} from "./calc";

type Participant = {
  id: string; // match_players.id
  name: string;
  avatarColor: string;
  avatarShape: string;
};

export function YamsScoreScreen({
  matchId,
  leagueId,
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
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [rounds, setRounds] = useState<Round[]>(initialRounds);
  const [status, setStatus] = useState(initialStatus);
  const [isPending, startTransition] = useTransition();
  const [settings, setSettings] = useState<YamsSettings>(DEFAULT_SETTINGS);
  const [settingsOpen, setSettingsOpen] = useState(false);
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
    supabase
      .from("league_game_settings")
      .select("settings")
      .eq("league_id", leagueId)
      .eq("game_code", "yams")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.settings && typeof data.settings === "object") {
          setSettings({ ...DEFAULT_SETTINGS, ...data.settings });
        }
      });
  }, [supabase, leagueId]);

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

  const totals = cumulativeTotals(rounds, participantIds, settings);
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

  async function saveSettings(next: YamsSettings) {
    setSettings(next);
    await supabase
      .from("league_game_settings")
      .upsert(
        { league_id: leagueId, game_code: "yams", settings: next, updated_at: new Date().toISOString() },
        { onConflict: "league_id,game_code" },
      );
    setSettingsOpen(false);
  }

  const gridTemplateColumns = `110px repeat(${participants.length}, minmax(92px, 1fr))`;

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
          <RulesButton gameCode="yams" gameName="Yams" />
          {!isCompleted && (
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              aria-label="Réglages du jeu"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-[#ddd] text-lg"
            >
              ⚙️
            </button>
          )}
          <div>
            <h1 className="font-fredoka text-xl font-bold text-onjoo-green-900">Yams</h1>
            {!isCompleted && (
              <p className="font-quicksand text-sm text-[#777]">
                Remplis les catégories dans l&apos;ordre que tu veux.
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
                <AvatarBadge color={participant.avatarColor} shape={participant.avatarShape} size={32} />
                <span className="truncate font-quicksand text-sm font-bold text-onjoo-green-900">
                  {participant.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div ref={bodyScrollRef} onScroll={syncHorizontalScroll} className="overflow-x-auto">
          <div className="grid gap-px bg-[#eee]" style={{ gridTemplateColumns }}>
            {CATEGORIES.map((category) => (
              <CategoryRow
                key={category.id}
                category={category}
                disabled={isCompleted}
                participants={participants}
                rounds={rounds}
                onSave={saveCell}
              />
            ))}
            {CATEGORIES.filter((c) => c.section === "upper").length > 0 && (
              <SubtotalRows
                rounds={rounds}
                participants={participants}
                settings={settings}
                afterUpperSection
              />
            )}
          </div>
        </div>

        <div ref={totalScrollRef} className="sticky bottom-0 z-20 overflow-x-hidden rounded-b-xl bg-[#FAF1DE]">
          <div className="grid" style={{ gridTemplateColumns }}>
            <div className="flex items-center justify-center px-1 py-2.5 font-fredoka text-sm font-bold text-onjoo-green-900">
              Total
            </div>
            {participants.map((participant) => (
              <div
                key={participant.id}
                className="flex items-center justify-center px-1 py-2.5 font-fredoka text-lg font-bold text-onjoo-green-900"
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

      {settingsOpen && (
        <SettingsModal
          settings={settings}
          onCancel={() => setSettingsOpen(false)}
          onSave={saveSettings}
        />
      )}
    </main>
  );
}

function CategoryRow({
  category,
  disabled,
  participants,
  rounds,
  onSave,
}: {
  category: { index: number; label: string };
  disabled: boolean;
  participants: Participant[];
  rounds: Round[];
  onSave: (matchPlayerId: string, roundIndex: number, points: number, detail: RoundDetail) => void;
}) {
  return (
    <>
      <div className="sticky left-0 z-10 flex items-center bg-white px-2 py-2 font-quicksand text-sm font-bold text-[#666]">
        {category.label}
      </div>
      {participants.map((participant) => {
        const round = rounds.find(
          (r) => r.match_player_id === participant.id && r.round_index === category.index,
        );
        return (
          <div key={participant.id} className="flex items-center justify-center bg-white px-1 py-2">
            <ScoreCell
              key={round ? `${round.id}-${round.points}` : "empty"}
              round={round}
              participantName={participant.name}
              disabled={disabled}
              onSave={(points, detail) => onSave(participant.id, category.index, points, detail)}
            />
          </div>
        );
      })}
    </>
  );
}

function SubtotalRows({
  rounds,
  participants,
  settings,
  afterUpperSection,
}: {
  rounds: Round[];
  participants: Participant[];
  settings: YamsSettings;
  afterUpperSection: boolean;
}) {
  if (!afterUpperSection) return null;
  return (
    <>
      <div className="sticky left-0 z-10 flex items-center bg-[#f4efe4] px-2 py-2 font-quicksand text-xs font-bold uppercase text-[#999]">
        Sous-total
      </div>
      {participants.map((participant) => (
        <div
          key={participant.id}
          className="flex items-center justify-center bg-[#f4efe4] px-1 py-2 font-quicksand text-sm font-bold text-onjoo-green-900"
        >
          {upperSubtotal(rounds, participant.id)}
        </div>
      ))}
      <div className="sticky left-0 z-10 flex items-center bg-[#f4efe4] px-2 py-2 font-quicksand text-xs font-bold uppercase text-[#999]">
        Bonus ({settings.bonusThreshold}+)
      </div>
      {participants.map((participant) => {
        const bonus = upperBonus(upperSubtotal(rounds, participant.id), settings);
        return (
          <div
            key={participant.id}
            className="flex items-center justify-center bg-[#f4efe4] px-1 py-2 font-quicksand text-sm font-bold"
            style={{ color: bonus > 0 ? "#163D2E" : "#bbb" }}
          >
            {bonus > 0 ? `+${bonus}` : "—"}
          </div>
        );
      })}
    </>
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
        className="h-11 w-14 rounded-lg border text-center font-quicksand text-lg font-bold text-onjoo-green-900 focus:outline-none disabled:opacity-70"
        style={{ borderWidth: 1, borderColor: "#ddd" }}
      />
    </div>
  );
}

function SettingsModal({
  settings,
  onCancel,
  onSave,
}: {
  settings: YamsSettings;
  onCancel: () => void;
  onSave: (settings: YamsSettings) => void | Promise<void>;
}) {
  const [threshold, setThreshold] = useState(String(settings.bonusThreshold));
  const [amount, setAmount] = useState(String(settings.bonusAmount));
  const [pending, setPending] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onCancel}>
      <div
        className="card flex w-full max-w-sm flex-col gap-4 rounded-b-none sm:rounded-b-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <span className="font-fredoka text-lg font-bold text-onjoo-green-900">
          Réglages Yams de la ligue
        </span>
        <p className="font-quicksand text-xs text-[#777]">
          Chaque famille a sa variante — ajuste le seuil et le bonus de la partie
          supérieure. S&apos;applique à toutes les parties de Yams de cette ligue.
        </p>
        <label className="flex flex-col gap-1">
          <span className="font-quicksand text-xs font-bold uppercase tracking-wide text-[#999]">
            Seuil de la partie supérieure
          </span>
          <input
            type="number"
            inputMode="numeric"
            value={threshold}
            onChange={(event) => setThreshold(event.target.value)}
            className="input-field"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-quicksand text-xs font-bold uppercase tracking-wide text-[#999]">
            Points de bonus
          </span>
          <input
            type="number"
            inputMode="numeric"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="input-field"
          />
        </label>
        <button
          type="button"
          disabled={pending}
          onClick={async () => {
            setPending(true);
            await onSave({
              bonusThreshold: Number(threshold) || DEFAULT_SETTINGS.bonusThreshold,
              bonusAmount: Number(amount) || DEFAULT_SETTINGS.bonusAmount,
            });
            setPending(false);
          }}
          className="btn-primary"
        >
          Valider
        </button>
      </div>
    </div>
  );
}
