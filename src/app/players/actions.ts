"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveLeague } from "@/lib/league";
import { randomAvatar } from "@/lib/avatar";

export async function addPlayer(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const isGuest = formData.get("is_guest") === "on";
  if (!name) return;

  const league = await getActiveLeague();
  if (!league) return;

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("players")
    .select("avatar_color, avatar_shape")
    .eq("league_id", league.id);
  const avatar = randomAvatar(existing ?? []);

  await supabase.from("players").insert({
    league_id: league.id,
    name,
    avatar_color: avatar.color,
    avatar_shape: avatar.shape,
    is_guest: isGuest,
  });

  revalidatePath("/players");
}

export async function updatePlayerAvatar(playerId: string, color: string, shape: string) {
  const supabase = await createClient();
  await supabase
    .from("players")
    .update({ avatar_color: color, avatar_shape: shape })
    .eq("id", playerId);

  // Visible aussi dans la NavBar (tous les écrans) et le Profil, pas
  // seulement la page Joueurs.
  revalidatePath("/", "layout");
}

export async function renamePlayer(playerId: string, name: string) {
  const trimmed = name.trim();
  if (!trimmed) return;

  const supabase = await createClient();
  await supabase.from("players").update({ name: trimmed }).eq("id", playerId);

  revalidatePath("/players");
}

// Archive plutôt que supprimer : un joueur peut avoir un historique de
// parties (match_players → rounds en cascade) qu'on ne veut jamais
// effacer par erreur. archived=true le retire juste des listes actives.
export async function archivePlayer(playerId: string) {
  const supabase = await createClient();
  await supabase.from("players").update({ archived: true }).eq("id", playerId);

  revalidatePath("/players");
}

// Fusionne deux fiches d'une même ligue en une seule (cas typique : un
// doublon créé par erreur, ex. une fiche liée au compte + une fiche sans
// compte pour la même personne). Ne touche jamais aux `rounds` : elles
// référencent `match_players.id`, pas le joueur directement — seul
// `match_players.player_id` doit être réassigné. La fiche source est
// archivée (jamais supprimée), la cible ressort de l'archive si besoin
// puisqu'elle devient la fiche survivante.
export async function mergePlayers(sourcePlayerId: string, targetPlayerId: string) {
  if (sourcePlayerId === targetPlayerId) return { error: "Impossible de fusionner une fiche avec elle-même." };

  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("players")
    .select("id, league_id")
    .in("id", [sourcePlayerId, targetPlayerId]);

  if (!rows || rows.length !== 2 || rows[0].league_id !== rows[1].league_id) {
    return { error: "Les deux fiches doivent appartenir à la même ligue." };
  }

  // Garde-fou : si les deux fiches ont déjà chacune une ligne dans la
  // même partie (cas très improbable, mais la réassignation créerait
  // sinon un doublon silencieux dans cette partie), on annule.
  const { data: sourceMatches } = await supabase
    .from("match_players")
    .select("match_id")
    .eq("player_id", sourcePlayerId);
  const { data: targetMatches } = await supabase
    .from("match_players")
    .select("match_id")
    .eq("player_id", targetPlayerId);
  const targetMatchIds = new Set((targetMatches ?? []).map((m) => m.match_id));
  const conflict = (sourceMatches ?? []).some((m) => targetMatchIds.has(m.match_id));
  if (conflict) {
    return {
      error: "Les deux fiches ont déjà été ajoutées à une même partie — fusion annulée pour éviter un doublon.",
    };
  }

  const { error: reassignError } = await supabase
    .from("match_players")
    .update({ player_id: targetPlayerId })
    .eq("player_id", sourcePlayerId);
  if (reassignError) return { error: reassignError.message };

  await supabase.from("players").update({ archived: true }).eq("id", sourcePlayerId);
  await supabase.from("players").update({ archived: false }).eq("id", targetPlayerId);

  revalidatePath("/players");
  return { error: null };
}

export type ExistingPlayerResult = {
  id: string;
  name: string;
  avatar_color: string;
  avatar_shape: string;
  league_name: string;
};

type LeagueJoin = { name: string };

// Recherche par nom parmi les fiches des AUTRES ligues où on est déjà
// membre (jamais un annuaire global) — la policy players_select fait déjà
// ce filtrage, on exclut juste la ligue active du résultat.
export async function searchExistingPlayers(query: string): Promise<ExistingPlayerResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const league = await getActiveLeague();
  if (!league) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("players")
    .select("id, name, avatar_color, avatar_shape, leagues(name)")
    .ilike("name", `%${trimmed}%`)
    .neq("league_id", league.id)
    .eq("archived", false)
    .limit(10);

  return (data ?? []).map((p) => {
    const leagueJoin = (Array.isArray(p.leagues) ? p.leagues[0] : p.leagues) as LeagueJoin | null;
    return {
      id: p.id,
      name: p.name,
      avatar_color: p.avatar_color,
      avatar_shape: p.avatar_shape,
      league_name: leagueJoin?.name ?? "",
    };
  });
}

export async function addExistingPlayerToLeague(sourcePlayerId: string) {
  const league = await getActiveLeague();
  if (!league) return { error: "Aucune ligue active." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("add_existing_player_to_league", {
    p_target_league_id: league.id,
    p_source_player_id: sourcePlayerId,
  });
  if (error) return { error: error.message };

  revalidatePath("/players");
  return { error: null };
}
