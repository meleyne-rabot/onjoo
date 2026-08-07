"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveLeague } from "@/lib/league";

// "Désactiver" un jeu ne touche jamais au catalogue global (games.active) —
// ça masque juste ce jeu pour CETTE ligue (Nos jeux, roulette), pour les
// jeux que la ligue ne possède pas / ne joue jamais.
export async function disableGameForLeague(formData: FormData) {
  const gameCode = String(formData.get("game_code") ?? "");
  if (!gameCode) return;

  const league = await getActiveLeague();
  if (!league) return;

  const supabase = await createClient();
  await supabase.from("league_games_disabled").insert({ league_id: league.id, game_code: gameCode });

  revalidatePath("/games");
}

export async function enableGameForLeague(formData: FormData) {
  const gameCode = String(formData.get("game_code") ?? "");
  if (!gameCode) return;

  const league = await getActiveLeague();
  if (!league) return;

  const supabase = await createClient();
  await supabase
    .from("league_games_disabled")
    .delete()
    .eq("league_id", league.id)
    .eq("game_code", gameCode);

  revalidatePath("/games");
}
