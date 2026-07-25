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
  const avatar = randomAvatar();

  await supabase.from("players").insert({
    league_id: league.id,
    name,
    avatar_color: avatar.color,
    avatar_shape: avatar.shape,
    is_guest: isGuest,
  });

  revalidatePath("/players");
}
