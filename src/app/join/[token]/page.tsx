import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { setActiveLeagueId } from "@/lib/league";

export default async function JoinLeaguePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/join/${token}`)}`);
  }

  const { data: leagueId, error } = await supabase.rpc(
    "join_league_by_token",
    { token },
  );

  if (error || !leagueId) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-2xl font-bold">Lien invalide</h1>
        <p className="text-neutral-500">
          Ce lien d&apos;invitation n&apos;est plus valide.
        </p>
      </main>
    );
  }

  await setActiveLeagueId(leagueId);
  redirect("/players");
}
