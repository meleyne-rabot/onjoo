// Couleurs de tuile — pas de vrais logos de jeux (photos de boîtes écartées,
// jurent avec le langage graphique en aplats de la charte).
export const GAME_META: Record<string, { label: string; accent: string }> = {
  qwirkle: { label: "Qwirkle", accent: "#2F6FB2" },
  uno: { label: "Uno", accent: "#DE5A34" },
  flip7: { label: "Flip Seven", accent: "#E9A23B" },
  ascenseur: { label: "Ascenseur", accent: "#5C3A73" },
  skyjo: { label: "Skyjo", accent: "#8A9A6E" },
};

export function gameMeta(code: string) {
  return GAME_META[code] ?? { label: code, accent: "#8A9A6E" };
}

export function gameInitials(label: string): string {
  return label.slice(0, 2).toUpperCase();
}
