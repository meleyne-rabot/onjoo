"use client";

import { useState } from "react";
import { AvatarBadge } from "@/components/AvatarBadge";
import { AvatarPicker } from "@/components/AvatarPicker";
import { renamePlayer, archivePlayer, updatePlayerAvatar } from "@/app/players/actions";
import type { AvatarColor, AvatarShape } from "@/lib/avatar";

type Player = {
  id: string;
  name: string;
  avatar_color: string;
  avatar_shape: string;
  is_guest: boolean;
};

export function PlayerRow({
  player,
  isMe,
  wins,
}: {
  player: Player;
  isMe: boolean;
  wins: number;
}) {
  const [editing, setEditing] = useState(false);
  const [pickingAvatar, setPickingAvatar] = useState(false);
  const [pending, setPending] = useState(false);

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
    </>
  );
}
