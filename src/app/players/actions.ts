"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveLeague } from "@/lib/league";
import { getLeagueAvatars } from "@/lib/player";
import { randomAvatar } from "@/lib/avatar";

// Crée un profil invité (durable, avec stats) — jamais lié à un compte.
// Un vrai compte ne s'obtient que par lien d'invitation ou en rattachant
// un profil déjà existant ailleurs (cf. addExistingPlayerToLeague).
export async function addPlayer(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const league = await getActiveLeague();
  if (!league) return;

  const supabase = await createClient();
  const avatar = randomAvatar(await getLeagueAvatars(league.id));

  const { data: created } = await supabase
    .from("players")
    .insert({ name, avatar_color: avatar.color, avatar_shape: avatar.shape, is_guest: true })
    .select("id")
    .single();

  if (created) {
    await supabase.from("league_players").insert({ league_id: league.id, player_id: created.id });
  }

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
// effacer par erreur. archived=true le retire juste des listes actives de
// CETTE ligue (l'identité étant globale, un joueur peut être actif dans une
// ligue et archivé dans une autre).
export async function archivePlayer(playerId: string) {
  const league = await getActiveLeague();
  if (!league) return;

  const supabase = await createClient();
  await supabase
    .from("league_players")
    .update({ archived: true })
    .eq("league_id", league.id)
    .eq("player_id", playerId);

  revalidatePath("/players");
}

// Fusionne deux fiches (doublon du même compte, souvent créé avant que les
// profils ne deviennent globaux) : réassigne toutes les parties de la
// source vers la cible, rattache la cible à toutes les ligues où la source
// était présente, puis neutralise la source (linked_user_id remis à null,
// jamais supprimée) plutôt que de la supprimer. Ne touche jamais aux
// rounds — elles référencent match_players.id, pas le joueur directement.
export async function mergePlayers(sourcePlayerId: string, targetPlayerId: string) {
  if (sourcePlayerId === targetPlayerId) return { error: "Impossible de fusionner une fiche avec elle-même." };

  const supabase = await createClient();

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

  // Rattache la cible à toutes les ligues où la source était présente
  // (fusion possible entre deux ligues différentes), sans écraser un
  // rattachement déjà existant côté cible.
  const { data: sourceLeaguePlayers } = await supabase
    .from("league_players")
    .select("league_id, archived")
    .eq("player_id", sourcePlayerId);
  for (const lp of sourceLeaguePlayers ?? []) {
    await supabase
      .from("league_players")
      .upsert(
        { league_id: lp.league_id, player_id: targetPlayerId, archived: lp.archived },
        { onConflict: "league_id,player_id", ignoreDuplicates: true },
      );
  }

  // La fiche source est neutralisée AVANT d'être détachée de ses ligues :
  // players_update exige qu'elle soit encore rattachée à une ligue commune
  // pour rester modifiable — inverser l'ordre la rendrait invisible avant
  // ce update, qui échouerait silencieusement (RLS).
  await supabase.from("players").update({ linked_user_id: null }).eq("id", sourcePlayerId);
  await supabase.from("league_players").delete().eq("player_id", sourcePlayerId);

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
type PlayerJoin = { id: string; name: string; avatar_color: string; avatar_shape: string };

// Recherche par nom parmi les fiches des AUTRES ligues où on est déjà
// membre (jamais un annuaire global) — la policy league_players_select
// fait déjà ce filtrage, on exclut juste la ligue active et les joueurs
// déjà rattachés à celle-ci.
export async function searchExistingPlayers(query: string): Promise<ExistingPlayerResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const league = await getActiveLeague();
  if (!league) return [];

  const supabase = await createClient();

  const { data: alreadyHere } = await supabase
    .from("league_players")
    .select("player_id")
    .eq("league_id", league.id);
  const alreadyHereIds = new Set((alreadyHere ?? []).map((row) => row.player_id));

  const { data, error } = await supabase
    .from("league_players")
    .select("leagues(name), players!inner(id, name, avatar_color, avatar_shape)")
    .neq("league_id", league.id)
    .eq("archived", false)
    .ilike("players.name", `%${trimmed}%`)
    .limit(20);

  if (error) {
    console.error("searchExistingPlayers failed:", error.message);
    throw new Error(error.message);
  }

  const seen = new Set<string>();
  const results: ExistingPlayerResult[] = [];
  for (const row of data ?? []) {
    const player = (Array.isArray(row.players) ? row.players[0] : row.players) as PlayerJoin | null;
    if (!player || seen.has(player.id) || alreadyHereIds.has(player.id)) continue;
    seen.add(player.id);
    const leagueJoin = (Array.isArray(row.leagues) ? row.leagues[0] : row.leagues) as LeagueJoin | null;
    results.push({
      id: player.id,
      name: player.name,
      avatar_color: player.avatar_color,
      avatar_shape: player.avatar_shape,
      league_name: leagueJoin?.name ?? "",
    });
    if (results.length >= 10) break;
  }
  return results;
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
