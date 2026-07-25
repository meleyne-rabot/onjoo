import { createLeague } from "./actions";

export default function NewLeaguePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Crée ta ligue</h1>
        <p className="text-neutral-500">
          Une ligue = un groupe de joueurs (ex: &quot;Famille Rabot&quot;)
        </p>
      </div>
      <form
        action={createLeague}
        className="flex w-full max-w-sm flex-col gap-4"
      >
        <input
          name="name"
          required
          placeholder="Nom de la ligue"
          className="rounded-xl border border-neutral-300 px-4 py-3 text-lg"
        />
        <button
          type="submit"
          className="rounded-xl bg-neutral-900 px-4 py-3 text-lg font-medium text-white"
        >
          Créer la ligue
        </button>
      </form>
    </main>
  );
}
