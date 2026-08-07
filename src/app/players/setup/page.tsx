import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { getActiveLeague } from "@/lib/league";
import { getMyPlayer, getMyGlobalPlayer, attachPlayerToLeague } from "@/lib/player";
import { Logo } from "@/components/Logo";
import { PlayerSetupForm } from "@/components/PlayerSetupForm";

export default async function PlayerSetupPage() {
  const league = await getActiveLeague();
  if (!league) redirect("/leagues/new");

  const existing = await getMyPlayer(league.id);
  if (existing) redirect("/games");

  // Un profil existe déjà (créé dans une autre ligue) : on le rattache
  // silencieusement ici, inutile de redemander "comment on t'appelle ?".
  const globalPlayer = await getMyGlobalPlayer();
  let attachError: string | null = null;
  if (globalPlayer) {
    attachError = await attachPlayerToLeague(league.id, globalPlayer.id);
    // Ne JAMAIS rediriger vers /games si le rattachement a échoué : /games
    // renverrait aussitôt ici (toujours pas de fiche dans CETTE ligue), ce
    // qui boucle silencieusement entre les deux pages sans jamais rien
    // afficher à la personne bloquée.
    if (!attachError) redirect("/games");
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
        {globalPlayer ? (
          <div>
            <h1 className="font-fredoka text-2xl font-bold text-onjoo-green-900">
              Un souci pour te rattacher à {league.name}
            </h1>
            <p className="font-quicksand text-sm text-onjoo-red-500">{attachError}</p>
            <p className="font-quicksand text-[#777]">
              Réessaie dans un instant, ou préviens la personne qui t&apos;a
              invité·e.
            </p>
          </div>
        ) : (
          <div>
            <h1 className="font-fredoka text-2xl font-bold text-onjoo-green-900">
              Et toi, comment on t&apos;appelle ?
            </h1>
            <p className="font-quicksand text-[#777]">
              Ce pseudo sera visible par les autres membres de {league.name}.
            </p>
          </div>
        )}
      </div>
      {!globalPlayer && <PlayerSetupForm suggestedName={suggestedName} />}
    </main>
  );
}
