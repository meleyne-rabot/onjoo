"use client";

import { useState } from "react";
import { AvatarBadge } from "@/components/AvatarBadge";
import { AvatarPicker } from "@/components/AvatarPicker";
import { updatePlayerAvatar } from "@/app/players/actions";
import type { AvatarColor, AvatarShape } from "@/lib/avatar";

export function ProfileAvatar({
  playerId,
  color,
  shape,
  size = 64,
}: {
  playerId: string;
  color: string;
  shape: string;
  size?: number;
}) {
  const [open, setOpen] = useState(false);

  async function handleSave(nextColor: AvatarColor, nextShape: AvatarShape) {
    await updatePlayerAvatar(playerId, nextColor, nextShape);
    setOpen(false);
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label="Changer ton avatar">
        <AvatarBadge color={color} shape={shape} size={size} />
      </button>
      {open && (
        <AvatarPicker
          initialColor={color}
          initialShape={shape}
          onCancel={() => setOpen(false)}
          onSave={handleSave}
        />
      )}
    </>
  );
}
