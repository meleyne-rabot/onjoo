"use client";

import { useState } from "react";

export function InviteLink({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);
  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/join/${token}`
      : "";

  async function copy() {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex items-center gap-2 rounded-xl border border-neutral-300 px-4 py-3">
      <span
        className="flex-1 truncate text-sm text-neutral-600"
        suppressHydrationWarning
      >
        {url || "Génération du lien..."}
      </span>
      <button
        type="button"
        onClick={copy}
        className="shrink-0 rounded-lg bg-neutral-900 px-3 py-1.5 text-sm text-white"
      >
        {copied ? "Copié !" : "Copier"}
      </button>
    </div>
  );
}
