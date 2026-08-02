import { cookies } from "next/headers";
import { cache } from "react";
import { createClient, getCurrentUser } from "@/lib/supabase/server";

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

  const user = await getCurrentUser();
  if (!user) return null;

  // La policy RLS de league_members autorise à voir une ligne si
  // user_id = soi-même OU si on est membre de la même ligue (nécessaire
  // pour que la page Joueurs liste les autres membres) — sans filtre
  // explicite ici, la requête remonte une ligne par membre de la ligue
  // au lieu d'une ligne par adhésion de CE compte.
  const { data: memberships } = await supabase
    .from("league_members")
    .select("league_id, leagues(id, name, invite_token)")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: true })
    .returns<MembershipRow[]>();

  if (!memberships || memberships.length === 0) return null;

  return normalizeLeague(memberships[0].leagues);
});

// Toutes les ligues du compte connecté (pour le sélecteur du profil) —
// distinct de getActiveLeague qui n'en résout qu'une.
export const getMyLeagues = cache(async (): Promise<ActiveLeague[]> => {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return [];

  const { data: memberships } = await supabase
    .from("league_members")
    .select("league_id, leagues(id, name, invite_token)")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: true })
    .returns<MembershipRow[]>();

  if (!memberships) return [];

  return memberships
    .map((m) => normalizeLeague(m.leagues))
    .filter((league): league is ActiveLeague => league !== null);
});

// Rôle du compte connecté dans une ligue donnée. 'observer' : accès
// support (RLS complète) sans jamais devenir un joueur visible — pas de
// fiche `players`, donc pas de redirection forcée vers /players/setup ni
// d'apparition dans les listes/rosters (cf. getMyPlayer, resté distinct).
export const getMyRole = cache(
  async (leagueId: string): Promise<string | null> => {
    const user = await getCurrentUser();
    if (!user) return null;

    const supabase = await createClient();
    const { data } = await supabase
      .from("league_members")
      .select("role")
      .eq("league_id", leagueId)
      .eq("user_id", user.id)
      .maybeSingle();

    return data?.role ?? null;
  },
);

export async function setActiveLeagueId(leagueId: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, leagueId, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}
