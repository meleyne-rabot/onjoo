"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AVATAR_COLORS } from "@/lib/avatar";
import { CATEGORY_ORDER, CATEGORY_LABELS } from "@/lib/games/categories";
import type { GameCategory } from "@/components/GameIcon";

type RouletteGame = { code: string; name: string; category: GameCategory };

// Nombre de tours complets avant de s'arrêter sur le jeu tiré, purement
// pour le spectacle — l'angle final seul détermine le résultat.
const EXTRA_SPINS = 4;
const SPIN_DURATION_MS = 3200;

function arcPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const start = {
    x: cx + r * Math.cos(startAngle),
    y: cy + r * Math.sin(startAngle),
  };
  const end = {
    x: cx + r * Math.cos(endAngle),
    y: cy + r * Math.sin(endAngle),
  };
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
}

export function GameRoulette({ games }: { games: RouletteGame[] }) {
  const [open, setOpen] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<RouletteGame | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const categoriesPresent = useMemo(
    () => CATEGORY_ORDER.filter((category) => games.some((g) => g.category === category)),
    [games],
  );
  // Tout coché par défaut — le filtre sert à RESTREINDRE au besoin, pas à
  // devoir tout re-sélectionner à chaque ouverture.
  const [selectedCategories, setSelectedCategories] = useState<Set<GameCategory>>(
    () => new Set(categoriesPresent),
  );

  if (games.length < 2) return null;

  const filteredGames = games.filter((g) => selectedCategories.has(g.category));

  const size = 260;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 6;
  const sliceAngle = filteredGames.length > 0 ? (2 * Math.PI) / filteredGames.length : 0;

  function toggleCategory(category: GameCategory) {
    setWinner(null);
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }

  function spin() {
    if (spinning || filteredGames.length < 2) return;
    setWinner(null);
    setSpinning(true);

    const winnerIndex = Math.floor(Math.random() * filteredGames.length);
    // La roue tourne dans le sens horaire ; le pointeur est fixe en haut
    // (angle -90°). Pour que la tranche gagnante finisse sous le pointeur,
    // on vise le milieu de cette tranche puis on compense la rotation.
    const sliceCenterDeg = (winnerIndex + 0.5) * (360 / filteredGames.length);
    const targetRotation = 360 * EXTRA_SPINS + (360 - sliceCenterDeg);

    // Repart toujours d'un multiple de 360 pour que EXTRA_SPINS tours
    // pleins soient parcourus à chaque lancer, même après un lancer précédent.
    setRotation((prev) => prev - (prev % 360) + targetRotation);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setSpinning(false);
      setWinner(filteredGames[winnerIndex]);
    }, SPIN_DURATION_MS);
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn-secondary text-center">
        🎡 Choisis pour nous
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
          <div className="card flex w-full max-w-sm flex-col items-center gap-5 py-6">
            <h2 className="font-fredoka text-xl font-bold text-onjoo-green-900">La roulette des jeux</h2>

            {categoriesPresent.length > 1 && (
              <div className="flex flex-wrap justify-center gap-2">
                {categoriesPresent.map((category) => {
                  const active = selectedCategories.has(category);
                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => toggleCategory(category)}
                      className={`rounded-full border-2 px-3 py-1 font-quicksand text-xs font-bold ${
                        active ? "border-onjoo-green-900 text-onjoo-green-900" : "border-[#ddd] text-[#999]"
                      }`}
                    >
                      {CATEGORY_LABELS[category]}
                    </button>
                  );
                })}
              </div>
            )}

            {filteredGames.length < 2 ? (
              <p className="font-quicksand text-sm text-[#777]">
                Sélectionne au moins deux catégories pour lancer la roulette.
              </p>
            ) : (
              <div className="relative" style={{ width: size, height: size + 18 }}>
                <div
                  className="absolute left-1/2 top-0 z-10 -translate-x-1/2"
                  style={{
                    width: 0,
                    height: 0,
                    borderLeft: "10px solid transparent",
                    borderRight: "10px solid transparent",
                    borderTop: "16px solid #163D2E",
                  }}
                />
                <svg
                  width={size}
                  height={size}
                  viewBox={`0 0 ${size} ${size}`}
                  className="absolute left-0 top-[18px]"
                  style={{
                    transform: `rotate(${rotation}deg)`,
                    transition: spinning
                      ? `transform ${SPIN_DURATION_MS}ms cubic-bezier(0.17, 0.67, 0.2, 1)`
                      : "none",
                  }}
                >
                  {filteredGames.map((game, i) => {
                    const start = i * sliceAngle - Math.PI / 2;
                    const end = start + sliceAngle;
                    const mid = start + sliceAngle / 2;
                    const labelX = cx + r * 0.62 * Math.cos(mid);
                    const labelY = cy + r * 0.62 * Math.sin(mid);
                    const labelDeg = (mid * 180) / Math.PI + 90;
                    return (
                      <g key={game.code}>
                        <path
                          d={arcPath(cx, cy, r, start, end)}
                          fill={AVATAR_COLORS[i % AVATAR_COLORS.length]}
                          stroke="#FAF1DE"
                          strokeWidth={2}
                        />
                        <text
                          x={labelX}
                          y={labelY}
                          fill="#fff"
                          fontSize={12}
                          fontWeight={700}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          transform={`rotate(${labelDeg} ${labelX} ${labelY})`}
                        >
                          {game.name}
                        </text>
                      </g>
                    );
                  })}
                  <circle cx={cx} cy={cy} r={16} fill="#FAF1DE" stroke="#163D2E" strokeWidth={2} />
                </svg>
              </div>
            )}

            {winner ? (
              <div className="flex flex-col items-center gap-3">
                <p className="font-quicksand text-sm text-[#777]">Et le sort en a décidé :</p>
                <p className="font-fredoka text-2xl font-bold text-onjoo-green-900">{winner.name} !</p>
                <div className="flex gap-2">
                  <Link href={`/games/${winner.code}/new`} className="btn-primary text-center">
                    Nouvelle partie
                  </Link>
                  <button type="button" onClick={spin} className="btn-secondary">
                    Relancer
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={spin}
                disabled={spinning || filteredGames.length < 2}
                className="btn-primary"
              >
                {spinning ? "..." : "Lancer la roulette"}
              </button>
            )}

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="font-quicksand text-sm text-[#777] underline"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </>
  );
}
