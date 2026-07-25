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
  const { data: players } = await supabase
    .from("players")
    .select("id, name, avatar_color, avatar_shape, is_guest")
    .eq("league_id", league.id)
    .eq("archived", false)
    .order("created_at", { ascending: true });

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-1">
        <p className="text-sm uppercase tracking-wide text-neutral-500">
          {league.name}
        </p>
        <h1 className="text-2xl font-bold">Joueurs</h1>
      </header>

      <section className="flex flex-col gap-3">
        {(players ?? []).map((player) => (
          <div
            key={player.id}
            className="flex items-center gap-3 rounded-xl border border-neutral-200 px-4 py-3"
          >
            <AvatarBadge color={player.avatar_color} shape={player.avatar_shape} />
            <div className="flex flex-col">
              <span className="text-lg font-medium">{player.name}</span>
              {player.is_guest && (
                <span className="text-xs text-neutral-500">Invité</span>
              )}
            </div>
          </div>
        ))}
        {(players ?? []).length === 0 && (
          <p className="text-neutral-500">Aucun joueur pour l&apos;instant.</p>
        )}
      </section>

      <form
        action={addPlayer}
        className="flex flex-col gap-3 rounded-xl border border-neutral-200 p-4"
      >
        <h2 className="font-medium">Ajouter un joueur</h2>
        <input
          name="name"
          required
          placeholder="Nom"
          className="rounded-xl border border-neutral-300 px-4 py-3 text-lg"
        />
        <label className="flex items-center gap-2 text-sm text-neutral-600">
          <input type="checkbox" name="is_guest" />
          Joueur invité (sans compte)
        </label>
        <button
          type="submit"
          className="rounded-xl bg-neutral-900 px-4 py-3 text-lg font-medium text-white"
        >
          Ajouter
        </button>
      </form>

      <section className="flex flex-col gap-2">
        <h2 className="font-medium">Inviter dans la ligue</h2>
        <InviteLink token={league.invite_token} />
      </section>

      <Link
        href="/matches/new"
        className="rounded-xl bg-emerald-600 px-4 py-4 text-center text-lg font-semibold text-white"
      >
        Nouvelle partie
      </Link>
    </main>
  );
}
