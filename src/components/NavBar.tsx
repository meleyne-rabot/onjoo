import Link from "next/link";
import { getCurrentUser } from "@/lib/supabase/server";
import { Logo } from "@/components/Logo";
import { AvatarBadge } from "@/components/AvatarBadge";
import { MobileTabBar } from "@/components/MobileTabBar";
import { getActiveLeague } from "@/lib/league";
import { getMyPlayer } from "@/lib/player";

export async function NavBar() {
  const user = await getCurrentUser();
  if (!user) return null;

  // Pas de ligue active = onboarding pas terminé (écran "Crée ta ligue" /
  // "Rejoindre") : les liens de nav (Nos jeux, Joueurs) n'ont pas encore
  // de sens tant qu'on n'est pas "dans" une ligue.
  const league = await getActiveLeague();
  if (!league) return null;

  const myPlayer = await getMyPlayer(league.id);

  return (
    <>
      <div className="px-4 pt-4 sm:px-6 sm:pt-6">
        <nav className="mx-auto flex max-w-3xl items-center justify-between gap-4 rounded-2xl border border-[#eee] bg-white px-4 py-3 sm:gap-5 sm:px-5 sm:py-3.5">
          <Link href="/games" className="shrink-0">
            <Logo variant="nav" />
          </Link>
          <Link
            href="/profil"
            className="flex min-w-0 items-center gap-1.5 rounded-full border border-[#eee] bg-onjoo-cream-50 px-3 py-1.5 no-underline"
            aria-label={`Ligue active : ${league.name}. Changer de ligue`}
          >
            <span className="truncate font-quicksand text-xs font-semibold text-onjoo-green-900 sm:text-sm">
              {league.name}
            </span>
            <svg
              width="10"
              height="10"
              viewBox="0 0 10 10"
              fill="none"
              className="shrink-0 text-onjoo-green-900/60"
            >
              <path
                d="M2 3.5L5 6.5L8 3.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
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
            <Link href="/profil" aria-label="Ton profil">
              {myPlayer ? (
                <AvatarBadge color={myPlayer.avatar_color} shape={myPlayer.avatar_shape} size={32} />
              ) : (
                <span className="font-quicksand text-xs font-semibold text-neutral-400">
                  Profil
                </span>
              )}
            </Link>
          </div>
        </nav>
      </div>
      <MobileTabBar />
    </>
  );
}
