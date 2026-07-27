"use client";

import { useState } from "react";
import { gameRules } from "@/lib/games/rules";

export function RulesButton({ gameCode, gameName }: { gameCode: string; gameName: string }) {
  const [open, setOpen] = useState(false);
  const rules = gameRules(gameCode);

  if (rules.length === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Règles du jeu"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-[#ddd] text-lg"
      >
        📖
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
          onClick={() => setOpen(false)}
        >
          <div
            className="card flex max-h-[80vh] w-full max-w-md flex-col gap-3 overflow-y-auto rounded-b-none sm:rounded-b-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-fredoka text-lg font-bold text-onjoo-green-900">
                Règles — {gameName}
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fermer"
                className="rounded-lg p-1 text-xl text-[#999]"
              >
                ✕
              </button>
            </div>
            <ul className="flex flex-col gap-2.5">
              {rules.map((rule, index) => (
                <li key={index} className="flex gap-2 font-quicksand text-sm text-onjoo-green-900">
                  <span className="text-[#999]">•</span>
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
