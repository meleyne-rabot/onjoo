import { cookies } from "next/headers";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

const COOKIE_NAME = "current_league_id";

export type ActiveLeague = {
  id: string;
  name: string;
  invite_token: string;
};

type MembershipRow = {
  league_id: string;
  leagues: ActiveLeague | ActiveLeague[] | null;
};

function normalizeLeague(
  leagues: ActiveLeague | ActiveLeague[] | null,
): ActiveLeague | null {
  if (!leagues) return null;
  return Array.isArray(leagues) ? (leagues[0] ?? null) : leagues;
}

// Dédupliqué par requête : NavBar et la page appellent toutes les deux
// getActiveLeague sur chaque navigation.
export const getActiveLeague = cache(async (): Promise<ActiveLeague | null> => {
  const supabase = await createClient();
  const cookieStore = await cookies();
  const cookieLeagueId = cookieStore.get(COOKIE_NAME)?.value;

  // Chemin rapide : la plupart des navigations ont déjà le cookie, donc
  // une seule lecture indexée sur leagues.id suffit (RLS vérifie toujours
  // l'appartenance — un cookie invalide/périmé ne renvoie simplement rien
  // et on retombe sur la requête complète ci-dessous).
  if (cookieLeagueId) {
    const { data } = await supabase
      .from("leagues")
      .select("id, name, invite_token")
      .eq("id", cookieLeagueId)
      .maybeSingle();
    if (data) return data;
  }

  const { data: memberships } = await supabase
    .from("league_members")
    .select("league_id, leagues(id, name, invite_token)")
    .order("joined_at", { ascending: true })
    .returns<MembershipRow[]>();

  if (!memberships || memberships.length === 0) return null;

  return normalizeLeague(memberships[0].leagues);
});

export async function setActiveLeagueId(leagueId: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, leagueId, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}
