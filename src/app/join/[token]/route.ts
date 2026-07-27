import { type NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { setActiveLeagueId } from "@/lib/league";

// Route Handler plutôt que page : rejoindre une ligue modifie un cookie
// (ligue active), ce que Next.js interdit dans une simple page/Server
// Component. Un Route Handler (comme un Server Action) est autorisé.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const next = encodeURIComponent(`/join/${token}`);
    return NextResponse.redirect(new URL(`/login?next=${next}`, request.url));
  }

  const { data: leagueId, error } = await supabase.rpc(
    "join_league_by_token",
    { token },
  );

  if (error || !leagueId) {
    return NextResponse.redirect(new URL("/join/invalid", request.url));
  }

  await setActiveLeagueId(leagueId);
  revalidatePath("/", "layout");
  return NextResponse.redirect(new URL("/players/setup", request.url));
}
