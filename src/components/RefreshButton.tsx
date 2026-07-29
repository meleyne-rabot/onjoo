"use client";

// Relance la page en dur (pas juste router.refresh()) pour repartir sur une
// connexion Realtime/websocket propre après un réseau pourri — un simple
// re-fetch de données ne rouvre pas le canal, le souci reste.
export function RefreshButton() {
  return (
    <button
      type="button"
      onClick={() => window.location.reload()}
      aria-label="Rafraîchir la page"
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-[#ddd] text-onjoo-green-900"
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path
          d="M13.5 8a5.5 5.5 0 1 1-1.7-3.95"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <path
          d="M13.5 2.5v3.5H10"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
