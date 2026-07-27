"use client";

import { useState } from "react";
import { leaveLeague, renameLeague, switchLeague } from "@/app/profil/actions";

type League = {
  id: string;
  name: string;
};

export function LeagueRow({ league, isActive }: { league: League; isActive: boolean }) {
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);

  if (editing) {
    return (
      <form
        action={async (formData) => {
          setPending(true);
          await renameLeague(formData);
          setPending(false);
          setEditing(false);
        }}
        className="card flex items-center gap-2"
      >
        <input type="hidden" name="league_id" value={league.id} />
        <input
          name="name"
          defaultValue={league.name}
          autoFocus
          className="input-field flex-1"
        />
        <button type="submit" disabled={pending} className="btn-secondary">
          OK
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          disabled={pending}
          className="btn-ghost"
        >
          Annuler
        </button>
      </form>
    );
  }

  return (
    <div className="card flex items-center justify-between gap-3">
      <span className="font-quicksand text-base font-medium text-onjoo-green-900">
        {league.name}
      </span>
      <div className="flex items-center gap-2">
        {isActive ? (
          <span
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1 font-quicksand text-xs font-bold"
            style={{ background: "#e6f4ea", color: "#1e7a3a" }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#1e7a3a" }} />
            Active
          </span>
        ) : (
          <form action={switchLeague.bind(null, league.id)}>
            <button type="submit" className="btn-secondary">
              Basculer
            </button>
          </form>
        )}
        <button
          type="button"
          onClick={() => setEditing(true)}
          disabled={pending}
          aria-label={`Renommer ${league.name}`}
          className="rounded-lg p-1.5 text-base"
        >
          ✎
        </button>
        {!isActive && (
          <form action={leaveLeague.bind(null, league.id)}>
            <button
              type="submit"
              className="font-quicksand text-xs font-semibold text-onjoo-red-500 underline"
            >
              Quitter
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
