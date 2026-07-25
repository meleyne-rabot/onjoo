import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions";

export async function NavBar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  return (
    <nav className="flex items-center justify-between border-b border-neutral-200 px-6 py-3">
      <Link href="/matches" className="font-bold">
        Onjoo
      </Link>
      <div className="flex items-center gap-4 text-sm">
        <Link href="/matches">Historique</Link>
        <Link href="/matches/new">Nouvelle partie</Link>
        <Link href="/players">Joueurs</Link>
        <form action={signOut}>
          <button type="submit" className="text-neutral-500">
            Déconnexion
          </button>
        </form>
      </div>
    </nav>
  );
}
