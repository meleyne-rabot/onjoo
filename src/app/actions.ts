"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { setActiveLeagueId } from "@/lib/league";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// Alternative au lien d'invitation (/join/[token]) : un code court à
// recopier à la main, utile quand le lien ne se copie/colle pas bien
// (ex. Safari iOS + certains claviers tiers refusent navigator.clipboard).
export async function joinLeagueByCode(code: string) {
  const trimmed = code.trim();
  if (!trimmed) return { error: "Code manquant." };

  const supabase = await createClient();
  const { data: leagueId, error } = await supabase.rpc("join_league_by_code", { code: trimmed });

  if (error || !leagueId) {
    return { error: "Code invalide — vérifie qu'il est bien recopié." };
  }

  await setActiveLeagueId(leagueId);
  revalidatePath("/", "layout");
  return { error: null };
}
