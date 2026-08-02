"use client";

import { useState, useTransition } from "react";
import { AvatarBadge } from "@/components/AvatarBadge";
import {
  searchExistingPlayers,
  addExistingPlayerToLeague,
  type ExistingPlayerResult,
} from "@/app/players/actions";

export function AddExistingPlayer() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ExistingPlayerResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const found = await searchExistingPlayers(query);
      setResults(found);
      setSearched(true);
    });
  }

  function handleAdd(playerId: string) {
    setError(null);
    startTransition(async () => {
      const result = await addExistingPlayerToLeague(playerId);
      if (result.error) {
        setError(result.error);
        return;
      }
      setAddedIds((prev) => new Set(prev).add(playerId));
    });
  }

  return (
    <div className="card flex flex-col gap-3">
      <h3 className="font-fredoka text-base font-semibold text-onjoo-green-900">
        Ajouter un joueur déjà connu sur Onjoo
      </h3>
      <p className="font-quicksand text-xs text-[#777]">
        Recherche parmi les joueurs de tes autres ligues — pas besoin de
        renvoyer un lien d&apos;invitation.
      </p>
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Nom du joueur…"
          className="input-field flex-1"
        />
        <button
          type="submit"
          disabled={isPending || query.trim().length < 2}
          className="btn-secondary"
        >
          Chercher
        </button>
      </form>

      {error && (
        <p className="font-quicksand text-xs font-semibold text-onjoo-red-500">{error}</p>
      )}

      {searched && results.length === 0 && (
        <p className="font-quicksand text-sm text-[#777]">
          Aucun joueur trouvé dans tes autres ligues.
        </p>
      )}

      {results.map((result) => (
        <div key={result.id} className="flex items-center gap-2">
          <AvatarBadge color={result.avatar_color} shape={result.avatar_shape} size={32} />
          <div className="flex flex-1 flex-col">
            <span className="font-quicksand text-sm font-medium text-onjoo-green-900">
              {result.name}
            </span>
            <span className="font-quicksand text-xs text-[#777]">
              Vu dans {result.league_name}
            </span>
          </div>
          {addedIds.has(result.id) ? (
            <span className="font-quicksand text-xs font-semibold text-onjoo-sage-500">
              Ajouté ✓
            </span>
          ) : (
            <button
              type="button"
              onClick={() => handleAdd(result.id)}
              disabled={isPending}
              className="btn-secondary"
            >
              Ajouter
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
