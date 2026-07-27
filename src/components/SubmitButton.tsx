"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

// Désactive le bouton pendant la soumission d'un <form action={...}> — sans
// ça, un double-clic (impatience, connexion lente) soumet le formulaire
// deux fois et crée deux lignes en base (ligue, joueur, partie...).
export function SubmitButton({
  children,
  pendingText,
  className = "btn-primary",
}: {
  children: ReactNode;
  pendingText?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? (pendingText ?? "...") : children}
    </button>
  );
}
