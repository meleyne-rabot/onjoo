"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveLeague } from "@/lib/league";
import { getMyPlayer, getMyGlobalPlayer, attachPlayerToLeague, getLeagueAvatars } from "@/lib/player";
import { randomAvatar } from "@/lib/avatar";

export async function createMyPlayer(
  _prevState: { error: string | null },
  formData: FormData,
): Promise<{ error: string | null }> {
  const name = String(formData.get("name") ?? "").trim();

  const league = await getActiveLeague();
  if (!league) redirect("/leagues/new");

  // Idempotent : un double-clic sur "Continuer" ne doit pas créer
  // plusieurs fiches pour la même personne.
  const existing = await getMyPlayer(league.id);
  if (existing) redirect("/games");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Un profil global existe déjà (créé entre-temps dans une autre ligue) :
  // on le rattache plutôt que d'en dupliquer un.
  const globalPlayer = await getMyGlobalPlayer();
  if (globalPlayer) {
    const attachError = await attachPlayerToLeague(league.id, globalPlayer.id);
    if (attachError) return { error: attachError };
    redirect("/games");
  }

  if (!name) return { error: "Pseudo manquant." };

  const avatar = randomAvatar(await getLeagueAvatars(league.id));

  const { data: created, error: insertError } = await supabase
    .from("players")
    .insert({
      name,
      avatar_color: avatar.color,
      avatar_shape: avatar.shape,
      is_guest: false,
      linked_user_id: user.id,
    })
    .select("id")
    .single();

  if (insertError || !created) {
    return { error: insertError?.message ?? "Échec de la création du profil." };
  }

  const attachError = await attachPlayerToLeague(league.id, created.id);
  if (attachError) return { error: attachError };

  redirect("/games");
}
