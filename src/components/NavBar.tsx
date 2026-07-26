import Link from "next/link";
import { getCurrentUser } from "@/lib/supabase/server";
import { signOut } from "@/app/actions";
import { Logo } from "@/components/Logo";
import { MobileTabBar } from "@/components/MobileTabBar";
import { getActiveLeague } from "@/lib/league";

export async function NavBar() {
  const user = await getCurrentUser();
  if (!user) return null;

  // Pas de ligue active = onboarding pas terminé (écran "Crée ta ligue" /
  // "Rejoindre") : les liens de nav (Nos jeux, Joueurs) n'ont pas encore
  // de sens tant qu'on n'est pas "dans" une ligue.
  const league = await getActiveLeague();
  if (!league) return null;

  return (
    <>
      <div className="px-4 pt-4 sm:px-6 sm:pt-6">
        <nav className="mx-auto flex max-w-3xl items-center justify-between gap-4 rounded-2xl border border-[#eee] bg-white px-4 py-3 sm:gap-5 sm:px-5 sm:py-3.5">
          <Link href="/games">
            <Logo variant="nav" />
          </Link>
          <div className="hidden items-center gap-7 sm:flex">
            <Link
              href="/games"
              className="font-fredoka text-[15px] font-semibold text-onjoo-green-900 no-underline"
            >
              Nos jeux
            </Link>
            <Link
              href="/players"
              className="font-fredoka text-[15px] font-semibold text-onjoo-green-900 no-underline"
            >
              Joueurs
            </Link>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              href="/games"
              className="hidden rounded-[10px] bg-onjoo-green-900 px-[18px] py-[9px] font-fredoka text-sm font-semibold text-white sm:inline-block"
            >
              + Partie
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="font-quicksand text-xs font-semibold text-neutral-400"
              >
                Déconnexion
              </button>
            </form>
          </div>
        </nav>
      </div>
      <MobileTabBar />
    </>
  );
}
