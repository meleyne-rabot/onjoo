"use client";

import { useState } from "react";
import { AvatarBadge } from "@/components/AvatarBadge";
import { AVATAR_COLORS, AVATAR_SHAPES, type AvatarColor, type AvatarShape } from "@/lib/avatar";

export function AvatarPicker({
  initialColor,
  initialShape,
  onCancel,
  onSave,
}: {
  initialColor: string;
  initialShape: string;
  onCancel: () => void;
  onSave: (color: AvatarColor, shape: AvatarShape) => void | Promise<void>;
}) {
  const [color, setColor] = useState<AvatarColor>(
    (AVATAR_COLORS as readonly string[]).includes(initialColor)
      ? (initialColor as AvatarColor)
      : AVATAR_COLORS[0],
  );
  const [shape, setShape] = useState<AvatarShape>(
    (AVATAR_SHAPES as readonly string[]).includes(initialShape)
      ? (initialShape as AvatarShape)
      : AVATAR_SHAPES[0],
  );
  const [pending, setPending] = useState(false);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={onCancel}
    >
      <div
        className="card flex w-full max-w-sm flex-col gap-4 rounded-b-none sm:rounded-b-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <span className="font-fredoka text-lg font-bold text-onjoo-green-900">
          Choisis ton avatar
        </span>

        <div className="flex items-center justify-center rounded-2xl bg-[#FAF1DE] p-6">
          <AvatarBadge color={color} shape={shape} size={84} />
        </div>

        <div>
          <span className="font-quicksand text-xs font-bold uppercase tracking-wide text-[#999]">
            Couleur
          </span>
          <div className="mt-2 flex gap-2.5">
            {AVATAR_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={`Couleur ${c}`}
                className="h-8 w-8 rounded-full"
                style={{
                  background: c,
                  boxShadow: color === c ? `0 0 0 2px #fff, 0 0 0 4px ${c}` : undefined,
                }}
              />
            ))}
          </div>
        </div>

        <div>
          <span className="font-quicksand text-xs font-bold uppercase tracking-wide text-[#999]">
            Forme
          </span>
          <div className="mt-2 grid grid-cols-6 gap-2">
            {AVATAR_SHAPES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setShape(s)}
                aria-label={`Forme ${s}`}
                className="flex items-center justify-center rounded-xl p-1.5"
                style={{ border: shape === s ? `2px solid ${color}` : "2px solid #eee" }}
              >
                <AvatarBadge color={color} shape={s} size={34} />
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          disabled={pending}
          onClick={async () => {
            setPending(true);
            await onSave(color, shape);
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
