"use client";

import { useState } from "react";
import { AvatarBadge } from "@/components/AvatarBadge";
import { AvatarPicker } from "@/components/AvatarPicker";
import { renamePlayer, archivePlayer, updatePlayerAvatar, mergePlayers } from "@/app/players/actions";
import type { AvatarColor, AvatarShape } from "@/lib/avatar";

type Player = {
  id: string;
  name: string;
  avatar_color: string;
  avatar_shape: string;
  is_guest: boolean;
};

type OtherPlayer = { id: string; name: string; archived: boolean };

export function PlayerRow({
  player,
  isMe,
  wins,
  otherPlayers,
}: {
  player: Player;
  isMe: boolean;
  wins: number;
  otherPlayers: OtherPlayer[];
}) {
  const [editing, setEditing] = useState(false);
  const [pickingAvatar, setPickingAvatar] = useState(false);
  const [merging, setMerging] = useState(false);
  const [mergeTarget, setMergeTarget] = useState(otherPlayers[0]?.id ?? "");
  const [mergeError, setMergeError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleMerge() {
    const target = otherPlayers.find((p) => p.id === mergeTarget);
    if (!target) return;
    if (
      !confirm(
        `Toutes les parties de ${player.name} seront rattachées à ${target.name}. ${player.name} sera ensuite archivé·e. Confirmer ?`,
      )
    ) {
      return;
    }
    setPending(true);
    setMergeError(null);
    const result = await mergePlayers(player.id, target.id);
    setPending(false);
    if (result?.error) {
      setMergeError(result.error);
      return;
    }
    setMerging(false);
  }

  async function handleArchive() {
    if (
      !confirm(
        `Supprimer ${player.name} ? Son historique de parties est conservé, mais il n'apparaîtra plus dans les listes.`,
      )
    ) {
      return;
    }
    setPending(true);
    await archivePlayer(player.id);
    setPending(false);
  }

  async function handleAvatarSave(color: AvatarColor, shape: AvatarShape) {
    await updatePlayerAvatar(player.id, color, shape);
    setPickingAvatar(false);
  }

  const avatarButton = (
    <button
      type="button"
      onClick={() => setPickingAvatar(true)}
      aria-label={`Changer l'avatar de ${player.name}`}
    >
      <AvatarBadge color={player.avatar_color} shape={player.avatar_shape} size={38} />
    </button>
  );

  if (editing) {
    return (
      <>
        <form
          action={async (formData) => {
            setPending(true);
            await renamePlayer(player.id, String(formData.get("name") ?? ""));
            setPending(false);
            setEditing(false);
          }}
          className="card flex items-center gap-2 py-3"
        >
          {avatarButton}
          <input
            name="name"
            defaultValue={player.name}
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
        {pickingAvatar && (
          <AvatarPicker
            initialColor={player.avatar_color}
            initialShape={player.avatar_shape}
            onCancel={() => setPickingAvatar(false)}
            onSave={handleAvatarSave}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div className="card flex items-center gap-2 py-3">
        {avatarButton}
        <div className="flex flex-1 flex-col">
          <span className="font-quicksand text-base font-medium text-onjoo-green-900">
            {player.name}
          </span>
          <div className="flex items-center gap-1.5 font-quicksand text-xs text-[#777]">
            {isMe && <span>Toi</span>}
            {!isMe && player.is_guest && <span>Invité</span>}
            {(isMe || player.is_guest) && <span>·</span>}
            <span>
              🏆 {wins} victoire{wins > 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setEditing(true)}
          disabled={pending}
          aria-label={`Renommer ${player.name}`}
          className="rounded-lg p-1.5 text-base"
        >
          ✎
        </button>
        {otherPlayers.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setMergeError(null);
              setMerging(true);
            }}
            disabled={pending}
            aria-label={`Fusionner ${player.name} avec une autre fiche`}
            className="rounded-lg p-1.5 text-base"
          >
            ⇄
          </button>
        )}
        <button
          type="button"
          onClick={handleArchive}
          disabled={pending}
          aria-label={`Supprimer ${player.name}`}
          className="rounded-lg p-1.5 text-base text-onjoo-red-500"
        >
          🗑
        </button>
      </div>
      {pickingAvatar && (
        <AvatarPicker
          initialColor={player.avatar_color}
          initialShape={player.avatar_shape}
          onCancel={() => setPickingAvatar(false)}
          onSave={handleAvatarSave}
        />
      )}
      {merging && (
        <div className="card flex flex-col gap-3">
          <h3 className="font-fredoka text-base font-semibold text-onjoo-green-900">
            Fusionner {player.name} avec…
          </h3>
          <p className="font-quicksand text-xs text-[#777]">
            Toutes les parties de {player.name} seront rattachées à la fiche choisie, qui
            devient la fiche active. {player.name} sera ensuite archivé·e.
          </p>
          <select
            value={mergeTarget}
            onChange={(event) => setMergeTarget(event.target.value)}
            className="input-field"
          >
            {otherPlayers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.archived ? " (archivée)" : ""}
              </option>
            ))}
          </select>
          {mergeError && (
            <p className="font-quicksand text-xs font-semibold text-onjoo-red-500">
              {mergeError}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleMerge}
              disabled={pending}
              className="btn-secondary flex-1"
            >
              Fusionner
            </button>
            <button
              type="button"
              onClick={() => setMerging(false)}
              disabled={pending}
              className="btn-ghost flex-1"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </>
  );
}
