"use client";

// Paire de flèches ◀▶ affichée dans l'en-tête de colonne d'un joueur —
// déplace sa colonne d'un cran, pour matcher l'ordre autour de la table.
export function ColumnOrderArrows({
  name,
  index,
  count,
  onMove,
}: {
  name: string;
  index: number;
  count: number;
  onMove: (direction: -1 | 1) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onMove(-1)}
        disabled={index === 0}
        aria-label={`Déplacer ${name} vers la gauche`}
        className="flex h-5 w-5 items-center justify-center rounded-full text-xs text-[#999] disabled:opacity-20"
      >
        ◀
      </button>
      <button
        type="button"
        onClick={() => onMove(1)}
        disabled={index === count - 1}
        aria-label={`Déplacer ${name} vers la droite`}
        className="flex h-5 w-5 items-center justify-center rounded-full text-xs text-[#999] disabled:opacity-20"
      >
        ▶
      </button>
    </div>
  );
}
