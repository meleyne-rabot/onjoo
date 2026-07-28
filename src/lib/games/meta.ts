import type { GameCategory } from "@/components/GameIcon";

// Icônes de catégorie (pion/dé/carte, vocabulaire du logo) en attendant
// de vrais logos de jeux — photos de boîtes écartées, jurent avec le
// langage graphique en aplats de la charte.
export const GAME_META: Record<string, { label: string; category: GameCategory }> = {
  qwirkle: { label: "Qwirkle", category: "tuiles" },
  uno: { label: "Uno", category: "cartes" },
  flip7: { label: "Flip 7", category: "cartes" },
  ascenseur: { label: "Ascenseur", category: "cartes" },
  skyjo: { label: "Skyjo", category: "cartes" },
  yams: { label: "Yam's", category: "des" },
};

export function gameMeta(code: string) {
  return GAME_META[code] ?? { label: code, category: "cartes" as GameCategory };
}
