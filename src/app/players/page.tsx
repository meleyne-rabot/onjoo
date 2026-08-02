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
  // n'apparaissent pas dans la liste principale. archived vit maintenant
  // sur league_players (par ligue), plus sur players (identité globale).
  const { data: leaguePlayers } = await supabase
    .from("league_players")
    .select("archived, players(id, name, avatar_color, avatar_shape, is_guest, linked_user_id)")
    .eq("league_id", league.id)
    .order("created_at", { ascending: true });

  type LeaguePlayerRow = NonNullable<typeof leaguePlayers>[number];
  function toPlayer(row: LeaguePlayerRow) {
    const p = Array.isArray(row.players) ? row.players[0] : row.players;
    if (!p) return null;
    return { ...p, archived: row.archived };
  }

  const allPlayers = (leaguePlayers ?? [])
    .map(toPlayer)
    .filter((p): p is NonNullable<typeof p> => p !== null);
  const players = allPlayers.filter((p) => !p.archived);

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

      <section className="flex flex-col gap-4">
        <h2 className="font-fredoka text-xl font-bold text-onjoo-green-900">
          Ajouter un joueur
        </h2>

        <form action={addPlayer} className="card flex flex-col gap-3">
          <h3 className="font-fredoka text-base font-semibold text-onjoo-green-900">
            Créer un profil invité
          </h3>
          <p className="font-quicksand text-xs text-[#777]">
            Sans compte, mais avec un vrai historique : ses parties et ses
            stats sont suivies comme pour n&apos;importe qui d&apos;autre.
          </p>
          <input name="name" required placeholder="Nom" className="input-field" />
          <SubmitButton pendingText="..." className="btn-secondary">
            Créer
          </SubmitButton>
        </form>

        <div className="card flex flex-col gap-3">
          <h3 className="font-fredoka text-base font-semibold text-onjoo-green-900">
            Inviter à s&apos;inscrire
          </h3>
          <p className="font-quicksand text-xs text-[#777]">
            La personne rejoint elle-même la ligue avec son propre compte.
          </p>
          <InviteLink token={league.invite_token} />
        </div>

        <AddExistingPlayer />
      </section>

      <Link href="/games" className="btn-primary text-center">
        Nouvelle partie
      </Link>
    </main>
  );
}
