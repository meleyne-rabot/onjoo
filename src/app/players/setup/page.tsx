import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { getActiveLeague } from "@/lib/league";
import { getMyPlayer, getMyGlobalPlayer, attachPlayerToLeague } from "@/lib/player";
import { Logo } from "@/components/Logo";
import { SubmitButton } from "@/components/SubmitButton";
import { createMyPlayer } from "./actions";

export default async function PlayerSetupPage() {
  const league = await getActiveLeague();
  if (!league) redirect("/leagues/new");

  const existing = await getMyPlayer(league.id);
  if (existing) redirect("/games");

  // Un profil existe déjà (créé dans une autre ligue) : on le rattache
  // silencieusement ici, inutile de redemander "comment on t'appelle ?".
  const globalPlayer = await getMyGlobalPlayer();
  if (globalPlayer) {
    await attachPlayerToLeague(league.id, globalPlayer.id);
    redirect("/games");
  }

  const user = await getCurrentUser();

  const suggestedName =
    (user?.user_metadata?.full_name as string | undefined) ??
    (user?.user_metadata?.name as string | undefined) ??
    user?.email?.split("@")[0] ??
    "";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <Logo variant="icon" />
        <div>
          <h1 className="font-fredoka text-2xl font-bold text-onjoo-green-900">
            Et toi, comment on t&apos;appelle ?
          </h1>
          <p className="font-quicksand text-[#777]">
            Ce pseudo sera visible par les autres membres de {league.name}.
          </p>
        </div>
      </div>
      <form
        action={createMyPlayer}
        className="flex w-full max-w-sm flex-col gap-4"
      >
        <input
          name="name"
          required
          defaultValue={suggestedName}
          placeholder="Ton pseudo"
          className="input-field"
        />
        <SubmitButton pendingText="...">Continuer</SubmitButton>
      </form>
    </main>
  );
}
