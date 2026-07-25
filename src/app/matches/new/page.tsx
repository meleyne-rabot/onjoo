import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getActiveLeague } from "@/lib/league";
import { AvatarBadge } from "@/components/AvatarBadge";
import { createMatch } from "./actions";

export default async function NewMatchPage() {
  const league = await getActiveLeague();
  if (!league) redirect("/leagues/new");

  const supabase = await createClient();
  const [{ data: games }, { data: players }] = await Promise.all([
    supabase
      .from("games")
      .select("code, name, active")
      .order("active", { ascending: false }),
    supabase
      .from("players")
      .select("id, name, avatar_color, avatar_shape")
      .eq("league_id", league.id)
      .eq("archived", false)
      .order("created_at", { ascending: true }),
  ]);

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col gap-8 px-6 py-10">
      <h1 className="text-2xl font-bold">Nouvelle partie</h1>

      <form action={createMatch} className="flex flex-col gap-8">
        <section className="flex flex-col gap-3">
          <h2 className="font-medium">Jeu</h2>
          <div className="grid grid-cols-2 gap-3">
            {(games ?? []).map((game) => (
              <label
                key={game.code}
                className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-center ${
                  game.active
                    ? "cursor-pointer border-neutral-300 has-[:checked]:border-neutral-900 has-[:checked]:bg-neutral-900 has-[:checked]:text-white"
                    : "border-neutral-100 text-neutral-400"
                }`}
              >
                <input
                  type="radio"
                  name="game_code"
                  value={game.code}
                  defaultChecked={game.code === "qwirkle"}
                  disabled={!game.active}
                  className="sr-only"
                />
                <span className="font-medium">{game.name}</span>
                {!game.active && <span className="text-xs">(bientôt)</span>}
              </label>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-medium">Joueurs</h2>
          <p className="text-sm text-neutral-500">
            Sélectionne au moins 2 joueurs.
          </p>
          {(players ?? []).length === 0 && (
            <p className="text-neutral-500">
              Ajoute d&apos;abord des joueurs depuis la page{" "}
              <Link href="/players" className="underline">
                Joueurs
              </Link>
              .
            </p>
          )}
          <div className="flex flex-col gap-2">
            {(players ?? []).map((player) => (
              <label
                key={player.id}
                className="flex items-center gap-3 rounded-xl border border-neutral-200 px-4 py-3 has-[:checked]:border-neutral-900"
              >
                <input
                  type="checkbox"
                  name="player_ids"
                  value={player.id}
                  className="h-5 w-5"
                />
                <AvatarBadge
                  color={player.avatar_color}
                  shape={player.avatar_shape}
                  size={36}
                />
                <span className="text-lg">{player.name}</span>
              </label>
            ))}
          </div>
        </section>

        <button
          type="submit"
          disabled={(players ?? []).length < 2}
          className="rounded-xl bg-emerald-600 px-4 py-4 text-lg font-semibold text-white disabled:opacity-40"
        >
          Démarrer la partie
        </button>
      </form>
    </main>
  );
}
