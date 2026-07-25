import { cookies } from "next/headers";
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

export async function getActiveLeague(): Promise<ActiveLeague | null> {
  const supabase = await createClient();
  const cookieStore = await cookies();
  const cookieLeagueId = cookieStore.get(COOKIE_NAME)?.value;

  const { data: memberships } = await supabase
    .from("league_members")
    .select("league_id, leagues(id, name, invite_token)")
    .order("joined_at", { ascending: true })
    .returns<MembershipRow[]>();

  if (!memberships || memberships.length === 0) return null;

  const match = cookieLeagueId
    ? memberships.find((m) => m.league_id === cookieLeagueId)
    : undefined;

  return normalizeLeague((match ?? memberships[0]).leagues);
}

export async function setActiveLeagueId(leagueId: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, leagueId, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}
