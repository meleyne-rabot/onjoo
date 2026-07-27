import { Logo } from "@/components/Logo";

export default function InvalidInvitePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <Logo variant="icon" />
      <h1 className="font-fredoka text-2xl font-bold text-onjoo-green-900">
        Lien invalide
      </h1>
      <p className="font-quicksand text-[#777]">
        Ce lien d&apos;invitation n&apos;est plus valide. Demande un nouveau
        lien à la personne qui te l&apos;a envoyé.
      </p>
    </main>
  );
}
