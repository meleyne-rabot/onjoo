import { Logo } from "@/components/Logo";
import { createLeague } from "./actions";

export default function NewLeaguePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <Logo variant="icon" />
        <div>
          <h1 className="font-fredoka text-2xl font-bold text-onjoo-green-900">
            Crée ta ligue
          </h1>
          <p className="font-quicksand text-[#777]">
            Une ligue = un groupe de joueurs (ex: &quot;Famille Rabot&quot;)
          </p>
        </div>
      </div>
      <form
        action={createLeague}
        className="flex w-full max-w-sm flex-col gap-4"
      >
        <input
          name="name"
          required
          placeholder="Nom de la ligue"
          className="input-field"
        />
        <button type="submit" className="btn-primary">
          Créer la ligue
        </button>
      </form>
    </main>
  );
}
