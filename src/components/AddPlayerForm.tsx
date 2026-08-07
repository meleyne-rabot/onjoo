"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { addPlayer } from "@/app/players/actions";

export function AddPlayerForm() {
  const [state, formAction] = useActionState(addPlayer, { error: null });

  return (
    <form action={formAction} className="card flex flex-col gap-3">
      <h3 className="font-fredoka text-base font-semibold text-onjoo-green-900">
        Créer un profil invité
      </h3>
      <p className="font-quicksand text-xs text-[#777]">
        Sans compte, mais avec un vrai historique : ses parties et ses stats
        sont suivies comme pour n&apos;importe qui d&apos;autre.
      </p>
      <input name="name" required placeholder="Nom" className="input-field" />
      {state.error && (
        <p className="font-quicksand text-xs font-semibold text-onjoo-red-500">{state.error}</p>
      )}
      <SubmitButton pendingText="..." className="btn-secondary">
        Créer
      </SubmitButton>
    </form>
  );
}
