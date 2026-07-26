import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveLeague } from "@/lib/league";
import { PlayerPicker } from "@/components/PlayerPicker";
import { GameIcon } from "@/components/GameIcon";
import { gameMeta } from "@/lib/games/meta";
import { addGuestPlayer, createMatch } from "./actions";

export default async function NewMatchPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const league = await getActiveLeague();
  if (!league) redirect("/leagues/new");

  const supabase = await createClient();
  const { data: game } = await supabase
    .from("games")
    .select("code, name, active")
    .eq("code", code)
    .maybeSingle();

  if (!game || !game.active) notFound();

  const { data: players } = await supabase
    .from("players")
    .select("id, name, avatar_color, avatar_shape")
    .eq("league_id", league.id)
    .eq("archived", false)
    .order("created_at", { ascending: true });

  const meta = gameMeta(code);

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col gap-8 px-6 py-10">
      <div className="flex items-center gap-3">
        <GameIcon category={meta.category} />
        <div>
          <p className="font-quicksand text-sm text-[#777]">{game.name}</p>
          <h1 className="font-fredoka text-2xl font-bold text-onjoo-green-900">
            Nouvelle partie
          </h1>
        </div>
      </div>

      <form action={addGuestPlayer} className="card flex flex-col gap-3">
        <h2 className="font-fredoka text-base font-semibold text-onjoo-green-900">
          Nouveau joueur dans la ligue
        </h2>
        <p className="font-quicksand text-sm text-[#777]">
          Accumule des stats dans le temps, comme les autres joueurs.
        </p>
        <input type="hidden" name="game_code" value={code} />
        <div className="flex gap-2">
          <input
            type="text"
            name="guest_player_name"
            placeholder="Nom"
            className="input-field flex-1"
          />
          <button type="submit" className="btn-secondary">
            Ajouter
          </button>
        </div>
      </form>

      <form action={createMatch} className="flex flex-col gap-6">
        <input type="hidden" name="game_code" value={code} />
        <div>
          <h2 className="mb-3 font-fredoka text-base font-semibold text-onjoo-green-900">
            Joueurs de cette partie
          </h2>
          <p className="mb-3 font-quicksand text-sm text-[#777]">
            Sélectionne des joueurs de la ligue, ou ajoute un joueur
            ponctuel (juste pour cette partie, sans créer de fiche).
          </p>
          <PlayerPicker players={players ?? []} />
        </div>

        <button type="submit" className="btn-primary">
          Démarrer la partie
        </button>
      </form>
    </main>
  );
}
