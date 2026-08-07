"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { createMyPlayer } from "@/app/players/setup/actions";

export function PlayerSetupForm({ suggestedName }: { suggestedName: string }) {
  const [state, formAction] = useActionState(createMyPlayer, { error: null });

  return (
    <form action={formAction} className="flex w-full max-w-sm flex-col gap-4">
      <input
        name="name"
        required
        defaultValue={suggestedName}
        placeholder="Ton pseudo"
        className="input-field"
      />
      {state.error && (
        <p className="font-quicksand text-xs font-semibold text-onjoo-red-500">{state.error}</p>
      )}
      <SubmitButton pendingText="...">Continuer</SubmitButton>
    </form>
  );
}
