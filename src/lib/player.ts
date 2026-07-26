import { cache } from "react";
import { createClient, getCurrentUser } from "@/lib/supabase/server";

export type MyPlayer = {
  id: string;
  name: string;
  avatar_color: string;
  avatar_shape: string;
};

// La fiche players liée au compte connecté (linked_user_id), dans une
// ligue donnée. Distincte des guests : c'est le "toi" dans le roster.
// Dédupliqué par requête (même clé leagueId).
export const getMyPlayer = cache(
  async (leagueId: string): Promise<MyPlayer | null> => {
    const user = await getCurrentUser();
    if (!user) return null;

    const supabase = await createClient();

    // .limit(1) avant .maybeSingle() : si jamais plusieurs fiches existent
    // pour ce compte (ex. double-clic passé), on prend la plus ancienne au
    // lieu de faire planter la requête (.maybeSingle() seul erreure sur
    // plusieurs lignes).
    const { data } = await supabase
      .from("players")
      .select("id, name, avatar_color, avatar_shape")
      .eq("league_id", leagueId)
      .eq("linked_user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    return data;
  },
);
