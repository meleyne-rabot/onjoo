"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { joinLeagueByCode } from "@/app/actions";

export function JoinLeagueByCode() {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await joinLeagueByCode(code);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.push("/players/setup");
    });
  }

  return (
    <div className="card flex flex-col gap-3">
      <h3 className="font-fredoka text-base font-semibold text-onjoo-green-900">
        Rejoindre une ligue
      </h3>
      <p className="font-quicksand text-xs text-[#777]">
        Un membre de la ligue te donne son code à 6 caractères — pas besoin
        de lien.
      </p>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          placeholder="Ex : A1B2C3"
          maxLength={6}
          className="input-field flex-1 uppercase tracking-widest"
        />
        <button type="submit" disabled={isPending || code.trim().length < 6} className="btn-secondary">
          Rejoindre
        </button>
      </form>
      {error && <p className="font-quicksand text-xs font-semibold text-onjoo-red-500">{error}</p>}
    </div>
  );
}
