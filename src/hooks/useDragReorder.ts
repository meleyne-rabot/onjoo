"use client";

import { useRef, useState } from "react";

// Réordonnancement au doigt/souris via Pointer Events (pas le drag-and-drop
// HTML natif : son support tactile est trop capricieux pour un geste fait
// en pleine partie sur mobile). Découplé de la persistance — ne fait QUE
// calculer l'ordre "live" pendant le drag et prévient `onCommit` une fois
// relâché ; à l'appelant de sauvegarder.
export function useDragReorder(baseOrder: string[], onCommit: (next: string[]) => void) {
  const [dragId, setDragId] = useState<string | null>(null);
  // null hors drag : `liveOrder` retombe alors directement sur baseOrder
  // (toujours à jour), sans jamais avoir besoin de resynchroniser un état
  // dérivé via useEffect.
  const [dragOrder, setDragOrder] = useState<string[] | null>(null);
  const [dragDeltaX, setDragDeltaX] = useState(0);
  const dragStartX = useRef(0);
  const columnWidth = useRef(92);
  const orderAtDragStart = useRef<string[]>(baseOrder);

  const liveOrder = dragOrder ?? baseOrder;

  function beginDrag(id: string, clientX: number, widthPx: number) {
    setDragId(id);
    setDragOrder(baseOrder);
    setDragDeltaX(0);
    dragStartX.current = clientX;
    columnWidth.current = widthPx || 92;
    orderAtDragStart.current = baseOrder;
  }

  function updateDrag(id: string, clientX: number) {
    if (dragId !== id) return;
    const delta = clientX - dragStartX.current;
    setDragDeltaX(delta);
    const steps = Math.round(delta / columnWidth.current);
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
  }

  function endDrag(id: string) {
    if (dragId !== id) return;
    const finalOrder = dragOrder ?? baseOrder;
    setDragId(null);
    setDragOrder(null);
    setDragDeltaX(0);
    onCommit(finalOrder);
  }

  return { liveOrder, dragId, dragDeltaX, beginDrag, updateDrag, endDrag };
}
