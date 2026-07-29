"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

export type PresenceUser = {
  id: string;
  name: string;
  avatarColor: string;
  avatarShape: string;
};

// Clé libre par jeu (ex. "matchPlayerId:roundIndex" pour Qwirkle/Skyjo/Flip7/
// Uno, "matchPlayerId:categoryId" pour Yam's, "matchPlayerId:roundIndex:bid"
// pour Ascenseur) — chaque écran de score choisit son propre format, le hook
// ne fait que la diffuser telle quelle.
type PresenceState = PresenceUser & { cell: string | null };

// Qui d'autre est sur cette partie en ce moment (façon Google Drive), et sur
// quelle case précise chacun tape (façon Google Docs) — présence Realtime
// éphémère, jamais écrite en base, juste diffusée aux autres onglets connectés.
export function useMatchPresence(
  supabase: SupabaseClient,
  matchId: string,
  me: PresenceUser,
) {
  const [others, setOthers] = useState<PresenceState[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const meRef = useRef(me);

  useEffect(() => {
    meRef.current = me;
  }, [me]);

  useEffect(() => {
    const channel = supabase.channel(`presence-${matchId}`, {
      config: { presence: { key: meRef.current.id } },
    });
    channelRef.current = channel;

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<PresenceState>();
        const list = Object.values(state)
          .map((entries) => entries[0])
          .filter((entry) => entry && entry.id !== meRef.current.id);
        setOthers(list);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ ...meRef.current, cell: null });
        }
      });

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [supabase, matchId]);

  function setEditingCell(cell: string | null) {
    channelRef.current?.track({ ...meRef.current, cell });
  }

  const editorsByCell = useMemo(() => {
    const map = new Map<string, PresenceState>();
    for (const other of others) {
      if (other.cell) map.set(other.cell, other);
    }
    return map;
  }, [others]);

  return { others, editorsByCell, setEditingCell };
}
