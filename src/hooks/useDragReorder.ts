"use client";

import { useRef, useState } from "react";

// Réordonnancement au doigt/souris via Pointer Events (pas le drag-and-drop
// HTML natif : son support tactile est trop capricieux pour un geste fait
// en pleine partie sur mobile). Découplé de la persistance — ne fait QUE
// calculer l'ordre "live" pendant le drag et prévient `onCommit` une fois
// relâché ; à l'appelant de sauvegarder.
//
// `updateDrag` renvoie un delta "résiduel" (mouvement du pointeur moins les
// créneaux déjà consommés par un changement d'ordre), à appliquer soi-même
// en transform CSS via une ref plutôt que de le stocker en state React :
// sinon chaque pixel de mouvement déclenche un re-render de toute la liste,
// ce qui rend le geste saccadé. Sans ce résidu, l'élément glissé sauterait
// d'un cran supplémentaire à chaque franchissement de seuil (la position
// naturelle ET le delta brut avancent tous les deux d'une hauteur de ligne
// au même moment).
export function useDragReorder(baseOrder: string[], onCommit: (next: string[]) => void) {
  const [dragId, setDragId] = useState<string | null>(null);
  // null hors drag : `liveOrder` retombe alors directement sur baseOrder
  // (toujours à jour), sans jamais avoir besoin de resynchroniser un état
  // dérivé via useEffect.
  const [dragOrder, setDragOrder] = useState<string[] | null>(null);
  const dragStart = useRef(0);
  const slotSize = useRef(52);
  const orderAtDragStart = useRef<string[]>(baseOrder);

  const liveOrder = dragOrder ?? baseOrder;

  function beginDrag(id: string, position: number, slotPx: number) {
    setDragId(id);
    setDragOrder(baseOrder);
    dragStart.current = position;
    slotSize.current = slotPx || 52;
    orderAtDragStart.current = baseOrder;
  }

  function updateDrag(id: string, position: number): number {
    if (dragId !== id) return 0;
    const delta = position - dragStart.current;
    const steps = Math.round(delta / slotSize.current);
    const base = orderAtDragStart.current;
    const fromIndex = base.indexOf(id);
    const toIndex = Math.max(0, Math.min(base.length - 1, fromIndex + steps));
    setDragOrder((current) => {
      const cur = current ?? base;
      const idx = cur.indexOf(id);
      if (idx === toIndex) return cur;
      const next = [...cur];
      next.splice(idx, 1);
      next.splice(toIndex, 0, id);
      return next;
    });
    return delta - (toIndex - fromIndex) * slotSize.current;
  }

  function endDrag(id: string) {
    if (dragId !== id) return;
    const finalOrder = dragOrder ?? baseOrder;
    setDragId(null);
    setDragOrder(null);
    onCommit(finalOrder);
  }

  return { liveOrder, dragId, beginDrag, updateDrag, endDrag };
}
