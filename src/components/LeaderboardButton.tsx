"use client";

import { useState } from "react";
import { AvatarBadge } from "@/components/AvatarBadge";

export type LeaderboardEntry = {
  id: string;
  name: string;
  avatarColor: string;
  avatarShape: string;
  score: number;
};

const MEDALS = ["🥇", "🥈", "🥉"];

// Classement compétition (1, 2, 2, 4 — pas de "3" après une égalité à 2) :
// deux scores identiques doivent afficher le même rang, sans en sauter un
// pour celui d'après.
function rankEntries(entries: LeaderboardEntry[], lowerIsBetter: boolean) {
  const sorted = [...entries].sort((a, b) => (lowerIsBetter ? a.score - b.score : b.score - a.score));
  const ranked: (LeaderboardEntry & { rank: number })[] = [];
  let rank = 0;
  let previousScore: number | null = null;
  sorted.forEach((entry, index) => {
    if (previousScore === null || entry.score !== previousScore) rank = index + 1;
    previousScore = entry.score;
    ranked.push({ ...entry, rank });
  });
  return ranked;
}

export function LeaderboardButton({
  entries,
  lowerIsBetter = false,
}: {
  entries: LeaderboardEntry[];
  lowerIsBetter?: boolean;
}) {
  const [open, setOpen] = useState(false);

  if (entries.length === 0) return null;
  const ranked = rankEntries(entries, lowerIsBetter);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Classement en cours"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-[#ddd] text-lg"
      >
        🏆
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
          onClick={() => setOpen(false)}
        >
          <div
            className="card flex max-h-[80vh] w-full max-w-md flex-col gap-3 overflow-y-auto rounded-b-none sm:rounded-b-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-fredoka text-lg font-bold text-onjoo-green-900">Classement</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fermer"
                className="rounded-lg p-1 text-xl text-[#999]"
              >
                ✕
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {ranked.map((entry) => (
                <div key={entry.id} className="flex items-center gap-3">
                  <span className="w-7 shrink-0 text-center font-fredoka text-sm font-bold text-[#999]">
                    {entry.rank <= 3 ? MEDALS[entry.rank - 1] : `${entry.rank}e`}
                  </span>
                  <AvatarBadge color={entry.avatarColor} shape={entry.avatarShape} size={36} />
                  <span className="flex-1 truncate font-quicksand text-sm font-semibold text-onjoo-green-900">
                    {entry.name}
                  </span>
                  <span className="font-fredoka text-base font-bold text-onjoo-green-900">
                    {entry.score} pts
                  </span>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="btn-secondary text-center"
            >
              Retour à la saisie
            </button>
          </div>
        </div>
      )}
    </>
  );
}
