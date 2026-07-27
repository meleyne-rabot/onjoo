"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { setActiveLeagueId } from "@/lib/league";

export async function renameLeague(formData: FormData) {
  const leagueId = String(formData.get("league_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!leagueId || !name) return;

  const supabase = await createClient();
  await supabase.from("leagues").update({ name }).eq("id", leagueId);

  revalidatePath("/profil");
}

export async function switchLeague(leagueId: string) {
  await setActiveLeagueId(leagueId);
  revalidatePath("/", "layout");
  redirect("/games");
}
