import { createClient } from "@/lib/supabase/server";

export type MyPlayer = {
  id: string;
  name: string;
  avatar_color: string;
  avatar_shape: string;
};

// La fiche players liée au compte connecté (linked_user_id), dans une
// ligue donnée. Distincte des guests : c'est le "toi" dans le roster.
export async function getMyPlayer(leagueId: string): Promise<MyPlayer | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("players")
    .select("id, name, avatar_color, avatar_shape")
    .eq("league_id", leagueId)
    .eq("linked_user_id", user.id)
    .maybeSingle();

  return data;
}
