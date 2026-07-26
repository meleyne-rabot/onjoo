"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/Logo";

function GoogleLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.6 15.6 18.9 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4c-7.5 0-14 4.2-17.7 10.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.5 0 10.4-1.9 14.2-5.1l-6.6-5.4C29.6 35.4 26.9 36 24 36c-5.3 0-9.7-3.4-11.3-8.1l-6.5 5C9.9 39.6 16.4 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.6 5.4C41.6 35.5 44 30.2 44 24c0-1.2-.1-2.3-.4-3.5z"
      />
    </svg>
  );
}

export default function LoginPage() {
  const [pending, setPending] = useState(false);

  async function handleGoogleSignIn() {
    setPending(true);
    const supabase = createClient();
    const next = new URLSearchParams(window.location.search).get("next");
    const confirmUrl = new URL("/auth/confirm", window.location.origin);
    if (next) confirmUrl.searchParams.set("next", next);

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: confirmUrl.toString() },
    });
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <Logo variant="icon" />
        <div className="flex flex-col gap-1">
          <h1 className="font-fredoka text-3xl font-bold text-onjoo-green-900">
            Onjoo
          </h1>
          <p className="font-quicksand text-[#777]">
            On joue ? Connecte-toi pour continuer.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={pending}
        className="flex w-full max-w-sm items-center justify-center gap-3 rounded-xl border-2 border-[#ddd4bd] bg-white px-4 py-3 font-fredoka text-base font-semibold text-onjoo-green-900 disabled:opacity-50"
      >
        <GoogleLogo />
        {pending ? "Redirection..." : "Continuer avec Google"}
      </button>
    </main>
  );
}
