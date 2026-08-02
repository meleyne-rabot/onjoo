"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Corrige la date d'une partie déjà terminée (ex. saisie a posteriori
// depuis une feuille papier, ou partie migrée d'une ligue à une autre).
export async function updateMatchDate(matchId: string, dateStr: string) {
  if (!dateStr) return;
  const supabase = await createClient();
  await supabase.from("matches").update({ played_at: new Date(dateStr).toISOString() }).eq("id", matchId);

  revalidatePath("/", "layout");
}
