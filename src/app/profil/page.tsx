import { redirect } from "next/navigation";
import Link from "next/link";
import { getActiveLeague, getMyLeagues } from "@/lib/league";
import { getMyPlayer } from "@/lib/player";
import { getCurrentUser } from "@/lib/supabase/server";
import { AvatarBadge } from "@/components/AvatarBadge";
import { signOut } from "@/app/actions";
import { leaveLeague, renameLeague, switchLeague } from "./actions";

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
            Ligue active
          </h2>
          <p className="font-quicksand text-xs text-[#777]">
            Une ligue regroupe les joueurs et les parties d&apos;une famille : tout
            le monde dans la même ligue voit les mêmes joueurs et le même
            historique.
          </p>
        </div>
        <form action={renameLeague} className="card flex flex-col gap-3">
          <input type="hidden" name="league_id" value={league.id} />
          <input name="name" defaultValue={league.name} className="input-field" />
          <button type="submit" className="btn-secondary">
            Renommer
          </button>
        </form>
      </section>

      {leagues.length > 1 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-fredoka text-base font-semibold text-onjoo-green-900">
            Tes ligues
          </h2>
          <div className="flex flex-col gap-2">
            {leagues.map((l) => (
              <div key={l.id} className="card flex items-center justify-between gap-3">
                <span className="font-quicksand text-base font-medium text-onjoo-green-900">
                  {l.name}
                </span>
                {l.id === league.id ? (
                  <span className="badge">Active</span>
                ) : (
                  <div className="flex items-center gap-2">
                    <form action={switchLeague.bind(null, l.id)}>
                      <button type="submit" className="btn-secondary">
                        Basculer
                      </button>
                    </form>
                    <form action={leaveLeague.bind(null, l.id)}>
                      <button
                        type="submit"
                        className="font-quicksand text-xs font-semibold text-onjoo-red-500 underline"
                      >
                        Quitter
                      </button>
                    </form>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <Link href="/leagues/new" className="btn-secondary text-center">
        Créer une nouvelle ligue
      </Link>

      <form action={signOut}>
        <button type="submit" className="btn-ghost w-full text-center">
          Déconnexion
        </button>
      </form>
    </main>
  );
}
