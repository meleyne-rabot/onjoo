"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveLeague } from "@/lib/league";

export async function createMatch(formData: FormData) {
  const gameCode = String(formData.get("game_code") ?? "");
  const playerIds = formData.getAll("player_ids").map(String);

  if (!gameCode || playerIds.length < 2) return;

  const league = await getActiveLeague();
  if (!league) redirect("/leagues/new");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: match, error } = await supabase
    .from("matches")
    .insert({ league_id: league.id, game_code: gameCode, created_by: user.id })
    .select("id")
    .single();

  if (error || !match) {
    throw new Error(error?.message ?? "match_create_failed");
  }

  await supabase.from("match_players").insert(
    playerIds.map((playerId) => ({
      match_id: match.id,
      player_id: playerId,
    })),
  );

  redirect(`/matches/${match.id}`);
}
