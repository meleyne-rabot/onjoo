"use client";

import { useState } from "react";
import { AvatarBadge } from "@/components/AvatarBadge";

type PlayerLite = {
  id: string;
  name: string;
  avatar_color: string;
  avatar_shape: string;
};

export function PlayerPicker({ players }: { players: PlayerLite[] }) {
  const [ephemeralNames, setEphemeralNames] = useState<string[]>([]);
  const [nameInput, setNameInput] = useState("");

  function addEphemeral() {
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    setEphemeralNames((current) => [...current, trimmed]);
    setNameInput("");
  }

  function removeEphemeral(index: number) {
    setEphemeralNames((current) => current.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        {players.map((player) => (
          <label
            key={player.id}
            className="card flex items-center gap-3 has-[:checked]:border-onjoo-green-900"
          >
            <input
              type="checkbox"
              name="player_ids"
              value={player.id}
              className="h-5 w-5"
            />
            <AvatarBadge
              color={player.avatar_color}
              shape={player.avatar_shape}
              size={36}
            />
            <span className="font-quicksand text-base font-medium text-onjoo-green-900">
              {player.name}
            </span>
          </label>
        ))}
        {players.length === 0 && (
          <p className="font-quicksand text-sm text-[#777]">
            Aucun joueur dans la ligue pour l&apos;instant.
          </p>
        )}
      </div>

      {ephemeralNames.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {ephemeralNames.map((name, index) => (
            <span key={`${name}-${index}`} className="badge flex items-center gap-2">
              {name}
              <input type="hidden" name="guest_names" value={name} />
              <button
                type="button"
                onClick={() => removeEphemeral(index)}
                className="font-fredoka text-sm font-bold"
                aria-label={`Retirer ${name}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={nameInput}
          onChange={(event) => setNameInput(event.target.value)}
          placeholder="Nom (pour cette partie seulement)"
          className="input-field flex-1"
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addEphemeral();
            }
          }}
        />
        <button type="button" onClick={addEphemeral} className="btn-secondary">
          + Joueur ponctuel
        </button>
      </div>
    </div>
  );
}
