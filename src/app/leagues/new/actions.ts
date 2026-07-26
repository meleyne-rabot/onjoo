"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { setActiveLeagueId } from "@/lib/league";

export async function createLeague(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: leagueId, error } = await supabase.rpc("create_league", {
    league_name: name,
  });

  if (error || !leagueId) {
    throw new Error(error?.message ?? "league_create_failed");
  }

  await setActiveLeagueId(leagueId);
  redirect("/players/setup");
}
