import { redirect } from "next/navigation";
import Link from "next/link";
import { getActiveLeague, getMyLeagues } from "@/lib/league";
import { getMyPlayer } from "@/lib/player";
import { getCurrentUser } from "@/lib/supabase/server";
import { AvatarBadge } from "@/components/AvatarBadge";
import { LeagueRow } from "@/components/LeagueRow";
import { signOut } from "@/app/actions";

export default async function ProfilPage() {
  const league = await getActiveLeague();
  if (!league) redirect("/leagues/new");

  const [myPlayer, leagues, user] = await Promise.all([
    getMyPlayer(league.id),
    getMyLeagues(),
    getCurrentUser(),
  ]);

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col gap-8 px-6 py-10">
      <header className="flex flex-col items-center gap-3 text-center">
        {myPlayer ? (
          <AvatarBadge color={myPlayer.avatar_color} shape={myPlayer.avatar_shape} size={64} />
        ) : null}
        <div>
          <h1 className="font-fredoka text-2xl font-bold text-onjoo-green-900">
            {myPlayer?.name ?? "Ton profil"}
          </h1>
          <p className="font-quicksand text-sm text-[#777]">{user?.email}</p>
        </div>
      </header>

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="font-fredoka text-base font-semibold text-onjoo-green-900">
            Tes ligues
          </h2>
          <p className="font-quicksand text-xs text-[#777]">
            Une ligue regroupe les joueurs et les parties d&apos;une famille : tout
            le monde dans la même ligue voit les mêmes joueurs et le même
            historique.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          {leagues.map((l) => (
            <LeagueRow key={l.id} league={l} isActive={l.id === league.id} />
          ))}
        </div>
        <Link href="/leagues/new" className="btn-secondary text-center">
          + Créer une nouvelle ligue
        </Link>
      </section>

      <form action={signOut}>
        <button type="submit" className="btn-ghost w-full text-center">
          Déconnexion
        </button>
      </form>
    </main>
  );
}
