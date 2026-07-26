"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveLeague } from "@/lib/league";
import { randomAvatar } from "@/lib/avatar";

export async function addGuestPlayer(formData: FormData) {
  const name = String(formData.get("guest_player_name") ?? "").trim();
  const gameCode = String(formData.get("game_code") ?? "");
  if (!name || !gameCode) return;

  const league = await getActiveLeague();
  if (!league) return;

  const supabase = await createClient();
  const avatar = randomAvatar();

  await supabase.from("players").insert({
    league_id: league.id,
    name,
    avatar_color: avatar.color,
    avatar_shape: avatar.shape,
    is_guest: true,
  });

  revalidatePath(`/games/${gameCode}/new`);
}

export async function createMatch(formData: FormData) {
  const gameCode = String(formData.get("game_code") ?? "");
  const playerIds = formData.getAll("player_ids").map(String);
  const guestNames = formData
    .getAll("guest_names")
    .map((value) => String(value).trim())
    .filter(Boolean);

  const totalParticipants = playerIds.length + guestNames.length;
  if (!gameCode || totalParticipants < 2) return;

  const league = await getActiveLeague();
  if (!league) redirect("/leagues/new");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: matchId, error } = await supabase.rpc("create_match", {
    p_league_id: league.id,
    p_game_code: gameCode,
    p_player_ids: playerIds,
    p_guest_names: guestNames,
  });

  if (error || !matchId) {
    throw new Error(error?.message ?? "match_create_failed");
  }

  redirect(`/matches/${matchId}`);
}
