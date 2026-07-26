import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Onjoo",
    short_name: "Onjoo",
    description: "On joue ? Scores et historique des jeux de société en famille.",
    start_url: "/",
    display: "standalone",
    background_color: "#FAF1DE",
    theme_color: "#163D2E",
    icons: [
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
