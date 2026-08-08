"use client";

import { useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

type Identified = { id: string };

// Ordre d'affichage des colonnes joueurs, modifiable via des flèches ◀▶
// pour refléter la place de chacun autour de la table — persisté sur
// match_players.turn_order (déjà la colonne utilisée pour trier les
// participants au chargement de la page, cf. matches/[id]/page.tsx),
// donc stable après rechargement. Indépendant de l'ordre "de calcul" des
// scores, qui n'est jamais affecté par cette réorganisation purement
// visuelle.
export function useColumnOrder<T extends Identified>(
  participants: T[],
  supabase: SupabaseClient,
  startTransition: (callback: () => void | Promise<void>) => void,
) {
  const [order, setOrder] = useState<string[]>(() => participants.map((p) => p.id));

  const orderedParticipants = useMemo(
    () =>
      order
        .map((id) => participants.find((p) => p.id === id))
        .filter((p): p is T => Boolean(p)),
    [order, participants],
  );

  function moveColumn(id: string, direction: -1 | 1) {
    const index = order.indexOf(id);
    const target = index + direction;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    [next[index], next[target]] = [next[target], next[index]];
    setOrder(next);
    startTransition(async () => {
      await Promise.all(
        next.map((pid, i) => supabase.from("match_players").update({ turn_order: i }).eq("id", pid)),
      );
    });
  }

  return { orderedParticipants, moveColumn };
}
