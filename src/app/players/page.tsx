import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getActiveLeague } from "@/lib/league";
import { AvatarBadge } from "@/components/AvatarBadge";
import { InviteLink } from "@/components/InviteLink";
import { addPlayer } from "./actions";

export default async function PlayersPage() {
  const league = await getActiveLeague();
  if (!league) redirect("/leagues/new");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: players } = await supabase
    .from("players")
    .select("id, name, avatar_color, avatar_shape, is_guest, linked_user_id")
    .eq("league_id", league.id)
    .eq("archived", false)
    .order("created_at", { ascending: true });

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-1">
        <p className="font-quicksand text-sm uppercase tracking-wide text-neutral-500">
          {league.name}
        </p>
        <h1 className="font-fredoka text-2xl font-bold text-onjoo-green-900">
          Joueurs
        </h1>
      </header>

      <section className="flex flex-col gap-3">
        {(players ?? []).map((player) => {
          const isMe = player.linked_user_id === user?.id;
          return (
            <div key={player.id} className="card flex items-center gap-3">
              <AvatarBadge color={player.avatar_color} shape={player.avatar_shape} />
              <div className="flex flex-col">
                <span className="font-quicksand text-lg font-medium text-onjoo-green-900">
                  {player.name}
                </span>
                {isMe && (
                  <span className="font-quicksand text-xs text-[#777]">Toi</span>
                )}
                {!isMe && player.is_guest && (
                  <span className="font-quicksand text-xs text-[#777]">Invité</span>
                )}
              </div>
            </div>
          );
        })}
        {(players ?? []).length === 0 && (
          <p className="font-quicksand text-neutral-500">
            Aucun joueur pour l&apos;instant.
          </p>
        )}
      </section>

      <form action={addPlayer} className="card flex flex-col gap-3">
        <h2 className="font-fredoka text-base font-semibold text-onjoo-green-900">
          Ajouter un joueur
        </h2>
        <input name="name" required placeholder="Nom" className="input-field" />
        <label className="flex items-center gap-2 font-quicksand text-sm text-[#666]">
          <input type="checkbox" name="is_guest" />
          Joueur invité (sans compte)
        </label>
        <button type="submit" className="btn-secondary">
          Ajouter
        </button>
      </form>

      <section className="flex flex-col gap-2">
        <h2 className="font-fredoka text-base font-semibold text-onjoo-green-900">
          Inviter dans la ligue
        </h2>
        <InviteLink token={league.invite_token} />
      </section>

      <Link href="/games" className="btn-primary text-center">
        Nouvelle partie
      </Link>
    </main>
  );
}
