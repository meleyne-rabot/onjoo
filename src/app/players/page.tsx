import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { getActiveLeague } from "@/lib/league";
import { InviteLink } from "@/components/InviteLink";
import { PlayerRow } from "@/components/PlayerRow";
import { AddExistingPlayer } from "@/components/AddExistingPlayer";
import { SubmitButton } from "@/components/SubmitButton";
import { addPlayer } from "./actions";

export default async function PlayersPage() {
  const league = await getActiveLeague();
  if (!league) redirect("/leagues/new");

  const user = await getCurrentUser();
  const supabase = await createClient();

  // On récupère aussi les fiches archivées : elles doivent rester
  // sélectionnables comme cible/source de fusion (le doublon à résorber
  // est souvent justement l'une des deux déjà archivée), même si elles
  // n'apparaissent pas dans la liste principale.
  const { data: allPlayers } = await supabase
    .from("players")
    .select("id, name, avatar_color, avatar_shape, is_guest, linked_user_id, archived")
    .eq("league_id", league.id)
    .order("created_at", { ascending: true });

  const players = (allPlayers ?? []).filter((p) => !p.archived);

  const allPlayerIds = (allPlayers ?? []).map((p) => p.id);
  const winsByPlayer = new Map<string, number>();
  if (allPlayerIds.length > 0) {
    const { data: wins } = await supabase
      .from("match_players")
      .select("player_id")
      .in("player_id", allPlayerIds)
      .eq("is_winner", true);
    for (const row of wins ?? []) {
      if (row.player_id) winsByPlayer.set(row.player_id, (winsByPlayer.get(row.player_id) ?? 0) + 1);
    }
  }

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
        {players.map((player) => (
          <PlayerRow
            key={player.id}
            player={player}
            isMe={player.linked_user_id === user?.id}
            wins={winsByPlayer.get(player.id) ?? 0}
            otherPlayers={(allPlayers ?? [])
              .filter((p) => p.id !== player.id)
              .map((p) => ({ id: p.id, name: p.name, archived: p.archived }))}
          />
        ))}
        {players.length === 0 && (
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
        <SubmitButton pendingText="..." className="btn-secondary">
          Ajouter
        </SubmitButton>
      </form>

      <AddExistingPlayer />

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
