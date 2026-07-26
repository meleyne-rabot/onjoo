"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveLeague } from "@/lib/league";
import { randomAvatar } from "@/lib/avatar";

export async function createMyPlayer(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const league = await getActiveLeague();
  if (!league) redirect("/leagues/new");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const avatar = randomAvatar();

  await supabase.from("players").insert({
    league_id: league.id,
    name,
    avatar_color: avatar.color,
    avatar_shape: avatar.shape,
    is_guest: false,
    linked_user_id: user.id,
  });

  redirect("/games");
}
