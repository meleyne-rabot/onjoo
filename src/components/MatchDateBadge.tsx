"use client";

import { useState, useTransition } from "react";
import { updateMatchDate } from "@/app/matches/actions";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

export function MatchDateBadge({ matchId, playedAt }: { matchId: string; playedAt: string | null }) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (editing) {
    return (
      <input
        type="date"
        defaultValue={playedAt ? playedAt.slice(0, 10) : ""}
        autoFocus
        disabled={isPending}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        onChange={(event) => {
          const value = event.target.value;
          startTransition(async () => {
            await updateMatchDate(matchId, value);
          });
          setEditing(false);
        }}
        onBlur={() => setEditing(false)}
        className="rounded border border-[#ddd] px-1.5 py-0.5 font-quicksand text-xs text-[#777]"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        setEditing(true);
      }}
      className="font-quicksand text-xs text-[#777] underline decoration-dotted underline-offset-2"
    >
      {playedAt ? formatDate(playedAt) : "Date inconnue"}
    </button>
  );
}
