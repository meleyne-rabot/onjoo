"use client";

import { useRef, useState } from "react";
import { AvatarBadge } from "@/components/AvatarBadge";
import { useDragReorder } from "@/hooks/useDragReorder";

type Entry = { id: string; name: string; avatarColor: string; avatarShape: string };

// Ligne d'un joueur dans le popup, glissable verticalement pour réordonner
// (poignée = toute la ligne). Pointer Events plutôt que le drag-and-drop
// HTML natif : bien plus fiable au toucher pour ce genre de geste.
function DraggableRow({
  id,
  dragId,
  dragDeltaY,
  onBeginDrag,
  onUpdateDrag,
  onEndDrag,
  children,
}: {
  id: string;
  dragId: string | null;
  dragDeltaY: number;
  onBeginDrag: (id: string, clientY: number, heightPx: number) => void;
  onUpdateDrag: (id: string, clientY: number) => void;
  onEndDrag: (id: string) => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isDragging = dragId === id;

  return (
    <div
      ref={ref}
      onPointerDown={(event) => {
        const height = ref.current?.getBoundingClientRect().height ?? 52;
        onBeginDrag(id, event.clientY, height);
        (event.currentTarget as Element).setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => onUpdateDrag(id, event.clientY)}
      onPointerUp={() => onEndDrag(id)}
      onPointerCancel={() => onEndDrag(id)}
      className="flex items-center gap-3 rounded-xl border border-[#eee] bg-white px-3 py-2.5"
      style={{
        touchAction: "none",
        cursor: isDragging ? "grabbing" : "grab",
        transform: isDragging ? `translateY(${dragDeltaY}px)` : undefined,
        position: isDragging ? "relative" : undefined,
        zIndex: isDragging ? 10 : undefined,
        boxShadow: isDragging ? "0 6px 16px rgba(0,0,0,0.15)" : undefined,
      }}
    >
      {children}
    </div>
  );
}

function PlayerOrderModal({
  participants,
  onClose,
  onReorder,
}: {
  participants: Entry[];
  onClose: () => void;
  onReorder: (next: string[]) => void;
}) {
  const baseOrder = participants.map((p) => p.id);
  const { liveOrder, dragId, dragDeltaX: dragDeltaY, beginDrag, updateDrag, endDrag } = useDragReorder(
    baseOrder,
    onReorder,
  );
  const ordered = liveOrder
    .map((id) => participants.find((p) => p.id === id))
    .filter((p): p is Entry => Boolean(p));

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={onClose}
    >
      <div
        className="card flex max-h-[80vh] w-full max-w-md flex-col gap-3 overflow-y-auto rounded-b-none sm:rounded-b-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-fredoka text-lg font-bold text-onjoo-green-900">Ordre des joueurs</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="rounded-lg p-1 text-xl text-[#999]"
          >
            ✕
          </button>
        </div>
        <p className="font-quicksand text-xs text-[#777]">
          Glisse un joueur pour le déplacer — pour refléter la place de chacun à table.
        </p>
        <div className="flex flex-col gap-2">
          {ordered.map((p) => (
            <DraggableRow
              key={p.id}
              id={p.id}
              dragId={dragId}
              dragDeltaY={dragDeltaY}
              onBeginDrag={beginDrag}
              onUpdateDrag={updateDrag}
              onEndDrag={endDrag}
            >
              <AvatarBadge color={p.avatarColor} shape={p.avatarShape} size={32} />
              <span className="flex-1 font-quicksand text-sm font-semibold text-onjoo-green-900">
                {p.name}
              </span>
              <span className="text-lg text-[#ccc]">☰</span>
            </DraggableRow>
          ))}
        </div>
        <button type="button" onClick={onClose} className="btn-primary text-center">
          Terminé
        </button>
      </div>
    </div>
  );
}

export function PlayerOrderButton({
  participants,
  onReorder,
}: {
  participants: Entry[];
  onReorder: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);

  if (participants.length < 2) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Réordonner les joueurs"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-[#ddd] text-base text-[#777]"
      >
        ⇄
      </button>
      {open && (
        <PlayerOrderModal
          participants={participants}
          onClose={() => setOpen(false)}
          onReorder={onReorder}
        />
      )}
    </>
  );
}
