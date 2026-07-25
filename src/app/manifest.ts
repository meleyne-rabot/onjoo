import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Onjoo",
    short_name: "Onjoo",
    description: "On joue ? Scores et historique des jeux de société en famille.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#171717",
    // TODO: remplacer par une vraie icône Onjoo (192x192 + 512x512) avant d'installer l'app sur un téléphone
    icons: [],
  };
}
