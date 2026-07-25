"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");

    const supabase = createClient();
    const next = new URLSearchParams(window.location.search).get("next");
    const confirmUrl = new URL("/auth/confirm", window.location.origin);
    if (next) confirmUrl.searchParams.set("next", next);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: confirmUrl.toString(),
      },
    });

    setStatus(error ? "error" : "sent");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-3xl font-bold">Onjoo</h1>
        <p className="text-neutral-500">On joue ? Connecte-toi pour continuer.</p>
      </div>

      {status === "sent" ? (
        <p className="max-w-sm text-center text-lg">
          Un lien de connexion vient d&apos;être envoyé à <strong>{email}</strong>.
          Ouvre-le depuis ce téléphone pour te connecter.
        </p>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="flex w-full max-w-sm flex-col gap-4"
        >
          <input
            type="email"
            required
            placeholder="ton@email.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="rounded-xl border border-neutral-300 px-4 py-3 text-lg"
          />
          <button
            type="submit"
            disabled={status === "sending"}
            className="rounded-xl bg-neutral-900 px-4 py-3 text-lg font-medium text-white disabled:opacity-50"
          >
            {status === "sending" ? "Envoi..." : "Recevoir le lien de connexion"}
          </button>
          {status === "error" && (
            <p className="text-center text-red-600">
              Un problème est survenu, réessaie dans un instant.
            </p>
          )}
        </form>
      )}
    </main>
  );
}
