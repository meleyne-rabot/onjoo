import { ImageResponse } from "next/og";
import { loadFredokaBold, OnjooIconMark } from "@/lib/onjoo-icon";

// Taille recommandée par Apple pour l'icône "Ajouter à l'écran d'accueil".
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function AppleIcon() {
  const fredokaBold = await loadFredokaBold();

  return new ImageResponse(<OnjooIconMark canvasSize={180} />, {
    ...size,
    fonts: [
      {
        name: "Fredoka",
        data: fredokaBold,
        weight: 700,
        style: "normal",
      },
    ],
  });
}
