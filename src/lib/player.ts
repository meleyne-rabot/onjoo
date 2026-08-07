import { cache } from "react";
import { createClient, getCurrentUser } from "@/lib/supabase/server";

export type MyPlayer = {
  id: string;
  name: string;
  avatar_color: string;
  avatar_shape: string;
};

type AvatarPair = { avatar_color: string; avatar_shape: string };

// La fiche players liée au compte connecté est globale (une seule, quelle
// que soit la ligue) — league_players fait le lien vers les ligues où elle
// participe réellement. Renvoie null si le profil n'existe pas encore, OU
// s'il existe mais n'est pas (encore) rattaché à CETTE ligue précise.
// Dédupliqué par requête (même clé leagueId).
export const getMyPlayer = cache(
  async (leagueId: string): Promise<MyPlayer | null> => {
    const user = await getCurrentUser();
    if (!user) return null;

    const supabase = await createClient();
    const { data } = await supabase
      .from("players")
      .select("id, name, avatar_color, avatar_shape, league_players!inner(league_id)")
      .eq("linked_user_id", user.id)
      .eq("league_players.league_id", leagueId)
      .limit(1)
      .maybeSingle();

    if (!data) return null;
    return {
      id: data.id,
      name: data.name,
      avatar_color: data.avatar_color,
      avatar_shape: data.avatar_shape,
    };
  },
);

// Le profil global du compte connecté, tous rattachements confondus — sert
// uniquement à décider si on doit réutiliser un profil déjà créé dans une
// autre ligue plutôt que d'en recréer un doublon.
export const getMyGlobalPlayer = cache(
  async (): Promise<MyPlayer | null> => {
    const user = await getCurrentUser();
    if (!user) return null;

    const supabase = await createClient();
    // .limit(1) avant .maybeSingle() : tant que d'anciens doublons
    // (une fiche par ligue, avant que le profil ne devienne global) n'ont
    // pas tous été fusionnés, plusieurs lignes peuvent encore matcher —
    // on prend la plus ancienne au lieu de faire planter la requête.
    const { data } = await supabase
      .from("players")
      .select("id, name, avatar_color, avatar_shape")
      .eq("linked_user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    return data;
  },
);

// Rattache un profil existant à une ligue — idempotent (ex. on rejoint une
// nouvelle ligue en ayant déjà un profil créé ailleurs). Renvoie un message
// d'erreur (au lieu de le passer sous silence) si le rattachement échoue :
// sans ça, l'appelant redirige comme si tout s'était bien passé, et la
// personne se retrouve bloquée à boucler sur /players/setup sans jamais
// savoir pourquoi.
export async function attachPlayerToLeague(
  leagueId: string,
  playerId: string,
): Promise<string | null> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("league_players")
    .upsert(
      { league_id: leagueId, player_id: playerId },
      { onConflict: "league_id,player_id", ignoreDuplicates: true },
    );
  return error?.message ?? null;
}

// Couleurs/formes déjà prises dans une ligue — pour éviter d'assigner deux
// fois le même avatar à un nouveau joueur (cf. randomAvatar).
export async function getLeagueAvatars(leagueId: string): Promise<AvatarPair[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("league_players")
    .select("players(avatar_color, avatar_shape)")
    .eq("league_id", leagueId);

  return (data ?? [])
    .map((row) => (Array.isArray(row.players) ? row.players[0] : row.players))
    .filter((p): p is AvatarPair => Boolean(p));
}
